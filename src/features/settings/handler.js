const { buildSettingsModal, buildSettingsPanel } = require('../../ui/settingsPanel');
const { parseIdList, parseSingleId } = require('../../utils/ids');
const { canConfigure } = require('../../utils/permissions');
const { applyPresence } = require('../../utils/presence');
const { replySafely } = require('../../utils/discord');
const { parseBooleanText } = require('../../utils/text');

// /config so deve funcionar dentro de um servidor.
function requireGuild(interaction) {
    return Boolean(interaction.inGuild());
}

// Converte o modal submetido em um patch parcial para guild_settings.
// Cada secao atualiza apenas o proprio bloco para nao apagar configuracoes
// feitas em outras telas do painel.
function settingsPatchFromModal(section, interaction, settings) {
    const fields = interaction.fields;

    if (section === 'channels') {
        return {
            channels: {
                logChannelId: parseSingleId(fields.getTextInputValue('log_channel_id')),
                partnershipChannelId: parseSingleId(fields.getTextInputValue('partnership_channel_id')),
                approvedPartnershipChannelId: parseSingleId(fields.getTextInputValue('approved_channel_id')),
            },
        };
    }

    if (section === 'roles') {
        return {
            roles: {
                partnerRoleId: parseSingleId(fields.getTextInputValue('partner_role_id')),
                approvedMentionRoleIds: parseIdList(fields.getTextInputValue('approved_mention_role_ids')),
            },
        };
    }

    if (section === 'admin_permissions') {
        return {
            permissions: {
                adminUserIds: parseIdList(fields.getTextInputValue('admin_user_ids')),
                adminRoleIds: parseIdList(fields.getTextInputValue('admin_role_ids')),
            },
        };
    }

    if (section === 'staff_permissions') {
        return {
            permissions: {
                staffUserIds: parseIdList(fields.getTextInputValue('staff_user_ids')),
                staffRoleIds: parseIdList(fields.getTextInputValue('staff_role_ids')),
            },
        };
    }

    if (section === 'final_permissions') {
        return {
            permissions: {
                finalApproverUserIds: parseIdList(fields.getTextInputValue('final_user_ids')),
                finalApproverRoleIds: parseIdList(fields.getTextInputValue('final_role_ids')),
            },
        };
    }

    if (section === 'command_permissions') {
        return {
            permissions: {
                commandUserIds: parseIdList(fields.getTextInputValue('command_user_ids')),
                commandRoleIds: parseIdList(fields.getTextInputValue('command_role_ids')),
            },
        };
    }

    if (section === 'dm_texts') {
        return {
            texts: {
                submissionReceivedDm: fields.getTextInputValue('submission_dm'),
                approvedDm: fields.getTextInputValue('approved_dm'),
                rejectedDm: fields.getTextInputValue('rejected_dm'),
            },
        };
    }

    if (section === 'public_texts') {
        return {
            texts: {
                partnershipButtonLabel: fields.getTextInputValue('button_label'),
                verifiedPhrase: fields.getTextInputValue('verified_phrase'),
            },
        };
    }

    if (section === 'presence') {
        return {
            texts: {
                presenceName: fields.getTextInputValue('presence_name'),
                presenceUrl: fields.getTextInputValue('presence_url'),
                presenceStatus: fields.getTextInputValue('presence_status').trim().toLowerCase(),
            },
        };
    }

    if (section === 'behavior') {
        return {
            behavior: {
                allowPublicSubmissions: parseBooleanText(fields.getTextInputValue('allow_public'), settings.behavior.allowPublicSubmissions),
                removeApprovedOnLeave: parseBooleanText(fields.getTextInputValue('remove_on_leave'), settings.behavior.removeApprovedOnLeave),
            },
        };
    }

    return {};
}

async function handleSettingsInteraction(context, interaction) {
    // Bloqueia uso do painel em DM.
    if (!requireGuild(interaction)) {
        await replySafely(interaction, {
            content: 'Este painel so pode ser usado dentro de um servidor.',
            ephemeral: true,
        });
        return;
    }

    // O primeiro /config cria o documento do servidor no Mongo.
    const settings = await context.repositories.settings.getOrCreate(interaction.guildId);

    // Em bot publico, dono do servidor e administradores do Discord tambem entram.
    // Admins configurados pelo painel continuam funcionando como permissao extra.
    if (!canConfigure(context, settings, interaction)) {
        await replySafely(interaction, {
            content: 'Voce nao tem permissao para configurar este bot.',
            ephemeral: true,
        });
        return;
    }

    // Comando /config: mostra o painel principal com resumo e menu.
    if (interaction.isChatInputCommand()) {
        await interaction.reply(buildSettingsPanel(settings, interaction.guild.name));
        return;
    }

    // Botoes do painel: cada categoria abre um modal especifico.
    if (interaction.isButton() && interaction.customId.startsWith('settings:open:')) {
        const section = interaction.customId.split(':')[2];
        await interaction.showModal(buildSettingsModal(section, settings));
        return;
    }

    // Submit do modal: salva no Mongo e mostra o painel atualizado.
    if (interaction.isModalSubmit() && interaction.customId.startsWith('settings:modal:')) {
        const section = interaction.customId.split(':')[2];
        const patch = settingsPatchFromModal(section, interaction, settings);
        const updatedSettings = await context.repositories.settings.update(interaction.guildId, patch);

        // Presenca precisa ser aplicada no client imediatamente.
        if (section === 'presence') {
            applyPresence(context.client, updatedSettings);
        }

        await interaction.reply({
            content: 'Configuracao salva.',
            ...buildSettingsPanel(updatedSettings, interaction.guild.name),
        });
    }
}

module.exports = {
    handleSettingsInteraction,
};
