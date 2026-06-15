const { EmbedBuilder } = require('discord.js');
const {
    buildFinalReviewRow,
    buildPartnershipFormModal,
    buildPreReviewRow,
    buildReasonModal,
    buildRequestButton,
} = require('../../ui/partnershipComponents');
const { getTextChannel, replySafely, sendDirectMessage } = require('../../utils/discord');
const { formatTemplate, truncate } = require('../../utils/text');
const { extractDiscordInvite } = require('../../utils/invite');
const { sendGuildLog } = require('../../utils/logger');
const {
    canFinalReview,
    canPreReview,
    canUsePartnershipCommand,
} = require('../../utils/permissions');
const { isPartnershipConfigured } = require('../../config/defaultSettings');
const {
    buildApprovedPostEmbed,
    buildRequestEmbed,
    getInviteUrlFromEmbed,
    getRequesterIdFromEmbed,
    getRequesterLabelFromEmbed,
    getServerNameFromEmbed,
    hasPreRejection,
} = require('./data');

// Carrega configuracoes do servidor e bloqueia o fluxo se os canais minimos
// ainda nao foram configurados pelo /config.
async function getGuildSettings(context, interaction) {
    if (!interaction.inGuild()) {
        await replySafely(interaction, {
            content: 'Este recurso so pode ser usado dentro de um servidor.',
            ephemeral: true,
        });
        return null;
    }

    const settings = await context.repositories.settings.get(interaction.guildId);
    if (!settings || !isPartnershipConfigured(settings)) {
        await replySafely(interaction, {
            content: 'O sistema de parcerias ainda nao foi configurado. Use /config para configurar os canais.',
            ephemeral: true,
        });
        return null;
    }

    return settings;
}

// Linha de mencoes do post aprovado: cargos configurados + solicitante.
function buildMentionLine(settings, requesterId, requesterLabel) {
    const roleMentions = settings.roles.approvedMentionRoleIds.map((roleId) => `<@&${roleId}>`).join(' ');
    const requesterMention = requesterId ? `<@${requesterId}>` : requesterLabel;

    return roleMentions ? `${roleMentions} - ${requesterMention}` : requesterMention;
}

// Aprova definitivamente uma parceria.
// Aqui acontece o post publico, cargo do parceiro, DM, log e rastreio no Mongo.
async function approvePartnership(context, interaction, settings, sourceMessage, approvalReason = null) {
    const sourceEmbed = sourceMessage.embeds[0];
    const inviteUrl = getInviteUrlFromEmbed(sourceEmbed);
    const requesterLabel = getRequesterLabelFromEmbed(sourceEmbed);
    const requesterId = getRequesterIdFromEmbed(sourceEmbed);
    const serverName = getServerNameFromEmbed(sourceEmbed);

    // Sem convite, a mensagem publica nao gera card e o fluxo perde sentido.
    if (!inviteUrl) {
        throw new Error('Convite da parceria nao encontrado.');
    }

    // Cargo opcional configurado no painel para quem teve parceria aprovada.
    if (settings.roles.partnerRoleId && requesterId && interaction.guild) {
        const requesterMember = await interaction.guild.members.fetch(requesterId).catch(() => null);
        if (requesterMember) {
            await requesterMember.roles.add(settings.roles.partnerRoleId).catch(() => null);
        }
    }

    const approvedChannel = await getTextChannel(
        context.client,
        settings.channels.approvedPartnershipChannelId,
        'approvedPartnershipChannelId',
    );

    // Convite no content gera o card nativo do Discord; a embed abaixo leva o texto.
    const approvedMessage = await approvedChannel.send({
        content: [
            inviteUrl,
            buildMentionLine(settings, requesterId, requesterLabel),
            settings.texts.verifiedPhrase,
        ].filter(Boolean).join('\n'),
        embeds: [buildApprovedPostEmbed(sourceEmbed)],
        allowedMentions: {
            roles: settings.roles.approvedMentionRoleIds,
            users: requesterId ? [requesterId] : [],
        },
    });

    // Rastreia a mensagem para apagar se o solicitante sair do servidor.
    await context.repositories.approvedPartnerships.add({
        guildId: interaction.guildId,
        userId: requesterId,
        channelId: approvedMessage.channelId,
        messageId: approvedMessage.id,
        createdAt: new Date(),
    });

    // DM configuravel; por padrao nao precisa conter link para evitar card visual.
    await sendDirectMessage(
        context.client,
        requesterId,
        formatTemplate(settings.texts.approvedDm, { servidor: serverName, convite: inviteUrl }),
    );

    // Fecha a solicitacao original como aprovada no canal de analise.
    const logEmbed = EmbedBuilder.from(sourceEmbed)
        .setColor('#00ff0d')
        .setTitle('Solicitacao de parceria aprovada')
        .addFields({ name: 'Decisao final', value: `Aprovada por ${interaction.user.tag}.` })
        .setFooter({ text: `Aprovada definitivamente por: ${interaction.user.tag}` });

    // Justificativa obrigatoria quando uma pre-rejeicao vira aprovacao final.
    if (approvalReason) {
        logEmbed.addFields({ name: 'Motivo da aprovacao', value: truncate(approvalReason, 1024) });
    }

    await sourceMessage.edit({
        components: [],
        embeds: [logEmbed],
    });

    await sendGuildLog(context, interaction.guildId, {
        embeds: [
            new EmbedBuilder()
                .setTitle('Parceria aprovada')
                .setDescription(`A parceria enviada por ${requesterLabel} foi aprovada.`)
                .setColor('#00ff0d')
                .setTimestamp(),
        ],
    });
}

// /parceria publica o botao que abre o formulario.
async function handlePartnershipCommand(context, interaction) {
    const settings = await getGuildSettings(context, interaction);
    if (!settings) return;

    // Quem publica o botao e controlado por usuarios/cargos configurados.
    if (!canUsePartnershipCommand(context, settings, interaction)) {
        await replySafely(interaction, {
            content: 'Voce nao tem permissao para publicar o botao de parceria.',
            ephemeral: true,
        });
        return;
    }

    await interaction.reply({
        components: [buildRequestButton(settings)],
        ephemeral: false,
    });
}

// Clique no botao de parceria: abre o modal do solicitante.
async function handleRequestButton(context, interaction) {
    const settings = await getGuildSettings(context, interaction);
    if (!settings) return;

    // Se solicitacoes publicas estiverem desligadas, so autorizados podem abrir o formulario.
    if (!settings.behavior.allowPublicSubmissions && !canUsePartnershipCommand(context, settings, interaction)) {
        await replySafely(interaction, {
            content: 'Voce nao tem permissao para enviar solicitacao de parceria.',
            ephemeral: true,
        });
        return;
    }

    await interaction.showModal(buildPartnershipFormModal());
}

// Submit do formulario: valida convite e envia a solicitacao para analise.
async function handlePartnershipForm(context, interaction) {
    const settings = await getGuildSettings(context, interaction);
    if (!settings) return;

    const inviteUrl = extractDiscordInvite(interaction.fields.getTextInputValue('invite_link'));
    // O convite precisa estar em formato reconhecido pelo Discord.
    if (!inviteUrl) {
        await interaction.reply({
            content: 'Envie um link de convite valido do Discord.',
            ephemeral: true,
        });
        return;
    }

    const formData = {
        serverName: interaction.fields.getTextInputValue('server_name'),
        inviteUrl,
        memberCount: interaction.fields.getTextInputValue('member_count'),
        hasSamBot: interaction.fields.getTextInputValue('has_sambot'),
        partnershipText: interaction.fields.getTextInputValue('partnership_text'),
    };

    // A equipe analisa no canal configurado, nao no canal onde o membro enviou.
    const reviewChannel = await getTextChannel(context.client, settings.channels.partnershipChannelId, 'partnershipChannelId');
    await reviewChannel.send({
        embeds: [buildRequestEmbed(interaction, formData)],
        components: [buildPreReviewRow()],
    });

    await sendDirectMessage(
        context.client,
        interaction.user.id,
        formatTemplate(settings.texts.submissionReceivedDm, {
            servidor: formData.serverName,
            convite: inviteUrl,
        }),
    );

    await interaction.reply({
        content: settings.texts.submissionReceivedDm,
        ephemeral: true,
    });
}

// Staff recomenda aprovacao e libera os botoes de decisao final.
async function handlePreApprove(context, interaction) {
    const settings = await getGuildSettings(context, interaction);
    if (!settings) return;

    if (!canPreReview(context, settings, interaction)) {
        await replySafely(interaction, {
            content: 'Voce nao tem permissao para fazer a pre-analise de parcerias.',
            ephemeral: true,
        });
        return;
    }

    const sourceEmbed = interaction.message.embeds[0];
    await interaction.update({
        components: [buildFinalReviewRow()],
        embeds: [
            EmbedBuilder.from(sourceEmbed)
                .setColor('#ffaa00')
                .setTitle('Solicitacao de parceria pre-aprovada')
                .addFields({
                    name: 'Pre-analise',
                    value: `Pre-aprovada por ${interaction.user.tag}. Aguardando decisao final.`,
                })
                .setFooter({ text: `Pre-aprovada por: ${interaction.user.tag}` }),
        ],
    });
}

// Staff recomenda rejeicao, mas precisa registrar motivo.
async function handlePreRejectButton(context, interaction) {
    const settings = await getGuildSettings(context, interaction);
    if (!settings) return;

    if (!canPreReview(context, settings, interaction)) {
        await replySafely(interaction, {
            content: 'Voce nao tem permissao para fazer a pre-analise de parcerias.',
            ephemeral: true,
        });
        return;
    }

    await interaction.showModal(buildReasonModal({
        customId: `partnership:modal_pre_reject:${interaction.message.id}`,
        title: 'Motivo da pre-rejeicao',
        label: 'Informe o motivo da pre-rejeicao',
        placeholder: 'Explique o que precisa ser corrigido para a parceria ser aceita.',
    }));
}

// Salva a pre-rejeicao na solicitacao. Nao envia DM nessa etapa.
async function handlePreRejectModal(context, interaction) {
    const settings = await getGuildSettings(context, interaction);
    if (!settings) return;

    if (!canPreReview(context, settings, interaction)) {
        await replySafely(interaction, {
            content: 'Voce nao tem permissao para fazer a pre-analise de parcerias.',
            ephemeral: true,
        });
        return;
    }

    const messageId = interaction.customId.split(':').pop();
    const rejectReason = interaction.fields.getTextInputValue('reason');
    const sourceMessage = await interaction.channel.messages.fetch(messageId).catch(() => null);

    if (!sourceMessage) {
        throw new Error('Mensagem original da parceria nao encontrada para pre-rejeicao.');
    }

    const sourceEmbed = sourceMessage.embeds[0];
    await sourceMessage.edit({
        components: [buildFinalReviewRow()],
        embeds: [
            EmbedBuilder.from(sourceEmbed)
                .setColor('#ffaa00')
                .setTitle('Solicitacao de parceria pre-rejeitada')
                .addFields(
                    {
                        name: 'Pre-analise',
                        value: `Pre-rejeitada por ${interaction.user.tag}. Aguardando decisao final.`,
                    },
                    { name: 'Motivo da rejeicao', value: truncate(rejectReason, 1024) },
                )
                .setFooter({ text: `Pre-rejeitada por: ${interaction.user.tag}` }),
        ],
    });

    await interaction.reply({
        content: 'Pre-rejeicao registrada. A solicitacao agora aguarda decisao final.',
        ephemeral: true,
    });
}

// Aprovacao final direta; se houve pre-rejeicao, abre modal de justificativa.
async function handleFinalApproveButton(context, interaction) {
    const settings = await getGuildSettings(context, interaction);
    if (!settings) return;

    if (!canFinalReview(context, settings, interaction)) {
        await replySafely(interaction, {
            content: 'Voce nao tem permissao para dar a decisao final desta parceria.',
            ephemeral: true,
        });
        return;
    }

    const sourceEmbed = interaction.message.embeds[0];
    // Reverter pre-rejeicao exige explicacao para auditoria interna.
    if (hasPreRejection(sourceEmbed)) {
        await interaction.showModal(buildReasonModal({
            customId: `partnership:modal_final_approve:${interaction.message.id}`,
            title: 'Motivo da aprovacao final',
            label: 'Por que aprovar apos pre-rejeicao?',
            placeholder: 'Explique a decisao final para manter no log.',
            inputId: 'approval_reason',
        }));
        return;
    }

    await interaction.deferReply({ ephemeral: true });
    await approvePartnership(context, interaction, settings, interaction.message);
    await interaction.editReply('Parceria aprovada definitivamente.');
}

// Continua aprovacao final depois do modal de justificativa.
async function handleFinalApproveModal(context, interaction) {
    const settings = await getGuildSettings(context, interaction);
    if (!settings) return;

    if (!canFinalReview(context, settings, interaction)) {
        await replySafely(interaction, {
            content: 'Voce nao tem permissao para dar a decisao final desta parceria.',
            ephemeral: true,
        });
        return;
    }

    const messageId = interaction.customId.split(':').pop();
    const approvalReason = interaction.fields.getTextInputValue('approval_reason');
    const sourceMessage = await interaction.channel.messages.fetch(messageId).catch(() => null);

    if (!sourceMessage) {
        throw new Error('Mensagem original da parceria nao encontrada para aprovacao.');
    }

    await interaction.deferReply({ ephemeral: true });
    await approvePartnership(context, interaction, settings, sourceMessage, approvalReason);
    await interaction.editReply('Parceria aprovada definitivamente e motivo registrado no log.');
}

// Rejeicao final sempre pede motivo, porque esse motivo vai para a DM.
async function handleFinalRejectButton(context, interaction) {
    const settings = await getGuildSettings(context, interaction);
    if (!settings) return;

    if (!canFinalReview(context, settings, interaction)) {
        await replySafely(interaction, {
            content: 'Voce nao tem permissao para dar a decisao final desta parceria.',
            ephemeral: true,
        });
        return;
    }

    await interaction.showModal(buildReasonModal({
        customId: `partnership:modal_final_reject:${interaction.message.id}`,
        title: 'Motivo da rejeicao final',
        label: 'Informe o motivo da rejeicao final',
        placeholder: 'Informe o motivo que sera enviado ao solicitante.',
    }));
}

// Fecha como rejeitada, registra log e avisa o solicitante por DM.
async function handleFinalRejectModal(context, interaction) {
    const settings = await getGuildSettings(context, interaction);
    if (!settings) return;

    if (!canFinalReview(context, settings, interaction)) {
        await replySafely(interaction, {
            content: 'Voce nao tem permissao para dar a decisao final desta parceria.',
            ephemeral: true,
        });
        return;
    }

    const messageId = interaction.customId.split(':').pop();
    const rejectReason = interaction.fields.getTextInputValue('reason');
    const sourceMessage = await interaction.channel.messages.fetch(messageId).catch(() => null);

    if (!sourceMessage) {
        throw new Error('Mensagem original da parceria nao encontrada para rejeicao.');
    }

    const sourceEmbed = sourceMessage.embeds[0];
    const requesterLabel = getRequesterLabelFromEmbed(sourceEmbed);
    const requesterId = getRequesterIdFromEmbed(sourceEmbed);
    const inviteUrl = getInviteUrlFromEmbed(sourceEmbed);
    const serverName = getServerNameFromEmbed(sourceEmbed);

    await sourceMessage.edit({
        components: [],
        embeds: [
            EmbedBuilder.from(sourceEmbed)
                .setColor('#ff0000')
                .setTitle('Solicitacao de parceria rejeitada')
                .addFields(
                    { name: 'Motivo final', value: truncate(rejectReason, 1024) },
                    { name: 'Decisao final', value: `Rejeitada por ${interaction.user.tag}.` },
                )
                .setFooter({ text: `Rejeitada definitivamente por: ${interaction.user.tag}` }),
        ],
    });

    await sendGuildLog(context, interaction.guildId, {
        embeds: [
            new EmbedBuilder()
                .setTitle('Parceria rejeitada')
                .setDescription(`A parceria enviada por ${requesterLabel} foi rejeitada.`)
                .addFields({ name: 'Motivo', value: truncate(rejectReason, 1024) })
                .setColor('#ff0000')
                .setTimestamp(),
        ],
    });

    await sendDirectMessage(
        context.client,
        requesterId,
        formatTemplate(settings.texts.rejectedDm, {
            motivo: rejectReason,
            servidor: serverName,
            convite: inviteUrl,
        }),
    );

    await interaction.reply({
        content: 'Parceria rejeitada definitivamente e motivo enviado ao solicitante.',
        ephemeral: true,
    });
}

// Router interno da feature de parcerias.
// Aceita customIds antigos para mensagens criadas antes da modularizacao.
async function handlePartnershipInteraction(context, interaction) {
    if (interaction.isChatInputCommand() && interaction.commandName === 'parceria') {
        await handlePartnershipCommand(context, interaction);
        return;
    }

    if (interaction.isButton() && ['partnership:request', 'realizar_parceria'].includes(interaction.customId)) {
        await handleRequestButton(context, interaction);
        return;
    }

    if (interaction.isModalSubmit() && ['partnership:submit', 'modal_parceria'].includes(interaction.customId)) {
        await handlePartnershipForm(context, interaction);
        return;
    }

    if (interaction.isButton() && ['partnership:pre_approve', 'pre_aprovar_parceria', 'aprovar_parceria'].includes(interaction.customId)) {
        await handlePreApprove(context, interaction);
        return;
    }

    if (interaction.isButton() && ['partnership:pre_reject', 'pre_rejeitar_parceria', 'rejeitar_parceria'].includes(interaction.customId)) {
        await handlePreRejectButton(context, interaction);
        return;
    }

    if (
        interaction.isModalSubmit() &&
        (interaction.customId.startsWith('partnership:modal_pre_reject:') || interaction.customId.startsWith('modal_pre_rejeitar_parceria:'))
    ) {
        await handlePreRejectModal(context, interaction);
        return;
    }

    if (interaction.isButton() && ['partnership:final_approve', 'final_aprovar_parceria'].includes(interaction.customId)) {
        await handleFinalApproveButton(context, interaction);
        return;
    }

    if (
        interaction.isModalSubmit() &&
        (interaction.customId.startsWith('partnership:modal_final_approve:') || interaction.customId.startsWith('modal_final_aprovar_parceria:'))
    ) {
        await handleFinalApproveModal(context, interaction);
        return;
    }

    if (interaction.isButton() && ['partnership:final_reject', 'final_rejeitar_parceria'].includes(interaction.customId)) {
        await handleFinalRejectButton(context, interaction);
        return;
    }

    if (
        interaction.isModalSubmit() &&
        (interaction.customId.startsWith('partnership:modal_final_reject:') || interaction.customId.startsWith('modal_final_rejeitar_parceria:'))
    ) {
        await handleFinalRejectModal(context, interaction);
    }
}

module.exports = {
    handlePartnershipInteraction,
};
