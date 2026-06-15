const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');
const { formatIdList } = require('../utils/ids');
const { truncate } = require('../utils/text');

// Helpers visuais para o resumo do painel.
function mentionChannel(id) {
    return id ? `<#${id}>` : 'Nao configurado';
}

function mentionRoles(ids = []) {
    return ids.length > 0 ? ids.map((id) => `<@&${id}>`).join(', ') : 'Nenhum';
}

function mentionUsers(ids = []) {
    return ids.length > 0 ? ids.map((id) => `<@${id}>`).join(', ') : 'Nenhum';
}

function statusBadge(value) {
    return value ? '`Configurado`' : '`Pendente`';
}

function countConfigured(settings) {
    const checks = [
        settings.channels.partnershipChannelId,
        settings.channels.approvedPartnershipChannelId,
        settings.roles.partnerRoleId,
        settings.roles.approvedMentionRoleIds.length > 0,
        settings.permissions.staffUserIds.length > 0 || settings.permissions.staffRoleIds.length > 0,
        settings.permissions.finalApproverUserIds.length > 0 || settings.permissions.finalApproverRoleIds.length > 0,
    ];

    return checks.filter(Boolean).length;
}

// Resumo visual do painel, parecido com dashboard.
function settingsSummary(settings) {
    const configured = countConfigured(settings);

    return [
        '**Ola! Seja bem-vindo ao painel de configuracao.**',
        'Use os botoes abaixo para configurar o bot por partes. Use `/help` para ver o passo a passo.',
        '',
        `**Sistema:** ${settings.setupComplete ? '`Operando`' : '`Pendente`'}`,
        `**Progresso:** \`${configured}/6 itens principais\``,
        `**Solicitacoes publicas:** \`${settings.behavior.allowPublicSubmissions ? 'sim' : 'nao'}\``,
        '',
        `**Canais:** ${statusBadge(settings.channels.partnershipChannelId && settings.channels.approvedPartnershipChannelId)}`,
        `Analise: ${mentionChannel(settings.channels.partnershipChannelId)}`,
        `Aprovados: ${mentionChannel(settings.channels.approvedPartnershipChannelId)}`,
        `Logs: ${mentionChannel(settings.channels.logChannelId)}`,
        '',
        `**Equipe:** Staff ${mentionUsers(settings.permissions.staffUserIds)} | ${mentionRoles(settings.permissions.staffRoleIds)}`,
        `**Final:** ${mentionUsers(settings.permissions.finalApproverUserIds)} | ${mentionRoles(settings.permissions.finalApproverRoleIds)}`,
    ].join('\n');
}

// Painel principal do /config.
// O help explica a ordem; aqui ficam botoes curtos para uso diario.
function buildSettingsPanel(settings, guildName = 'Servidor') {
    const embed = new EmbedBuilder()
        .setTitle(`${guildName} | Painel de configuracao`)
        .setDescription(settingsSummary(settings))
        .setColor(settings.setupComplete ? '#7c5cff' : '#ffb000')
        .setFooter({ text: settings.setupComplete ? 'Sistema pronto para operar' : 'Configure canais e permissoes para liberar o fluxo' })
        .setTimestamp();

    const mainRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('settings:open:channels').setLabel('Canais').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('settings:open:roles').setLabel('Cargos').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('settings:open:staff_permissions').setLabel('Equipe').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('settings:open:final_permissions').setLabel('Aprovadores').setStyle(ButtonStyle.Primary),
    );

    const textRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('settings:open:admin_permissions').setLabel('Admins').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('settings:open:command_permissions').setLabel('/parceria').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('settings:open:dm_texts').setLabel('DMs').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('settings:open:public_texts').setLabel('Textos').setStyle(ButtonStyle.Secondary),
    );

    const systemRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('settings:open:behavior').setLabel('Outros').setStyle(ButtonStyle.Secondary),
    );

    return {
        embeds: [embed],
        components: [mainRow, textRow, systemRow],
        ephemeral: true,
    };
}

// Fabrica de input para reduzir repeticao na montagem dos modals.
function textInput({ id, label, value, style = TextInputStyle.Short, placeholder = '', required = false, maxLength = 1000 }) {
    const input = new TextInputBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setStyle(style)
        .setPlaceholder(placeholder)
        .setRequired(required)
        .setMaxLength(maxLength);

    if (value !== undefined && value !== null && String(value).length > 0) {
        input.setValue(truncate(String(value), maxLength));
    }

    return new ActionRowBuilder().addComponents(input);
}

// Cada secao do painel vira um modal proprio.
function buildSettingsModal(section, settings) {
    const modal = new ModalBuilder()
        .setCustomId(`settings:modal:${section}`)
        .setTitle('Configuracao');

    if (section === 'channels') {
        modal.setTitle('Configurar canais').addComponents(
            textInput({ id: 'partnership_channel_id', label: 'Canal onde a staff analisa', value: settings.channels.partnershipChannelId, placeholder: 'Cole o ID do canal de analise', required: true }),
            textInput({ id: 'approved_channel_id', label: 'Canal das parcerias aprovadas', value: settings.channels.approvedPartnershipChannelId, placeholder: 'Cole o ID do canal publico', required: true }),
            textInput({ id: 'log_channel_id', label: 'Canal de logs/avisos', value: settings.channels.logChannelId, placeholder: 'Cole o ID do canal de logs' }),
        );
    }

    if (section === 'roles') {
        modal.setTitle('Configurar cargos').addComponents(
            textInput({ id: 'partner_role_id', label: 'Cargo que o aprovado ganha', value: settings.roles.partnerRoleId, placeholder: 'Cole o ID do cargo' }),
            textInput({ id: 'approved_mention_role_ids', label: 'Cargo marcado no post aprovado', value: formatIdList(settings.roles.approvedMentionRoleIds), placeholder: 'Cole um ou mais IDs de cargo' }),
        );
    }

    if (section === 'admin_permissions') {
        modal.setTitle('Permissoes admin').addComponents(
            textInput({ id: 'admin_user_ids', label: 'Pessoas que podem configurar', value: formatIdList(settings.permissions.adminUserIds), placeholder: 'Cole IDs de usuarios' }),
            textInput({ id: 'admin_role_ids', label: 'Cargos que podem configurar', value: formatIdList(settings.permissions.adminRoleIds), placeholder: 'Cole IDs de cargos' }),
        );
    }

    if (section === 'staff_permissions') {
        modal.setTitle('Permissoes staff').addComponents(
            textInput({ id: 'staff_user_ids', label: 'Pessoas da pre-analise', value: formatIdList(settings.permissions.staffUserIds), placeholder: 'Cole IDs de usuarios' }),
            textInput({ id: 'staff_role_ids', label: 'Cargos da pre-analise', value: formatIdList(settings.permissions.staffRoleIds), placeholder: 'Cole IDs de cargos' }),
        );
    }

    if (section === 'final_permissions') {
        modal.setTitle('Aprovadores finais').addComponents(
            textInput({ id: 'final_user_ids', label: 'Pessoas que decidem no final', value: formatIdList(settings.permissions.finalApproverUserIds), placeholder: 'Cole IDs de usuarios' }),
            textInput({ id: 'final_role_ids', label: 'Cargos que decidem no final', value: formatIdList(settings.permissions.finalApproverRoleIds), placeholder: 'Cole IDs de cargos' }),
        );
    }

    if (section === 'command_permissions') {
        modal.setTitle('Permissao /parceria').addComponents(
            textInput({ id: 'command_user_ids', label: 'Pessoas que publicam o botao', value: formatIdList(settings.permissions.commandUserIds), placeholder: 'Cole IDs de usuarios' }),
            textInput({ id: 'command_role_ids', label: 'Cargos que publicam o botao', value: formatIdList(settings.permissions.commandRoleIds), placeholder: 'Cole IDs de cargos' }),
        );
    }

    if (section === 'dm_texts') {
        modal.setTitle('Textos de DM').addComponents(
            textInput({ id: 'submission_dm', label: 'DM quando envia pedido', value: settings.texts.submissionReceivedDm, style: TextInputStyle.Paragraph, required: true, maxLength: 1000 }),
            textInput({ id: 'approved_dm', label: 'DM quando aprova', value: settings.texts.approvedDm, style: TextInputStyle.Paragraph, required: true, maxLength: 1000 }),
            textInput({ id: 'rejected_dm', label: 'DM quando rejeita', value: settings.texts.rejectedDm, style: TextInputStyle.Paragraph, required: true, maxLength: 1000 }),
        );
    }

    if (section === 'public_texts') {
        modal.setTitle('Textos publicos').addComponents(
            textInput({ id: 'button_label', label: 'Nome do botao de parceria', value: settings.texts.partnershipButtonLabel, placeholder: 'Realizar parceria', required: true, maxLength: 80 }),
            textInput({ id: 'verified_phrase', label: 'Frase no post aprovado', value: settings.texts.verifiedPhrase, style: TextInputStyle.Paragraph, required: true, maxLength: 500 }),
        );
    }

    if (section === 'behavior') {
        modal.setTitle('Comportamento').addComponents(
            textInput({ id: 'allow_public', label: 'Qualquer membro pode pedir?', value: settings.behavior.allowPublicSubmissions ? 'sim' : 'nao', placeholder: 'sim/nao', required: true, maxLength: 10 }),
            textInput({ id: 'remove_on_leave', label: 'Apagar post se membro sair?', value: settings.behavior.removeApprovedOnLeave ? 'sim' : 'nao', placeholder: 'sim/nao', required: true, maxLength: 10 }),
        );
    }

    return modal;
}

module.exports = {
    buildSettingsModal,
    buildSettingsPanel,
};
