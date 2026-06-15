const { handlePartnershipInteraction } = require('./partnerships/handler');
const { handleSettingsInteraction } = require('./settings/handler');
const { handleHelpInteraction } = require('./help/handler');

async function handleInteraction(context, interaction) {
    if (interaction.isChatInputCommand() && interaction.commandName === 'help') {
        await handleHelpInteraction(interaction);
        return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'config') {
        await handleSettingsInteraction(context, interaction);
        return;
    }

    if (
        interaction.isButton() && interaction.customId.startsWith('settings:') ||
        interaction.isStringSelectMenu() && interaction.customId.startsWith('settings:') ||
        interaction.isModalSubmit() && interaction.customId.startsWith('settings:')
    ) {
        await handleSettingsInteraction(context, interaction);
        return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'parceria') {
        await handlePartnershipInteraction(context, interaction);
        return;
    }

    if (
        interaction.isButton() && (
            interaction.customId.startsWith('partnership:') ||
            [
                'realizar_parceria',
                'pre_aprovar_parceria',
                'aprovar_parceria',
                'pre_rejeitar_parceria',
                'rejeitar_parceria',
                'final_aprovar_parceria',
                'final_rejeitar_parceria',
            ].includes(interaction.customId)
        ) ||
        interaction.isModalSubmit() && (
            interaction.customId.startsWith('partnership:') ||
            interaction.customId.startsWith('modal_pre_rejeitar_parceria:') ||
            interaction.customId.startsWith('modal_final_aprovar_parceria:') ||
            interaction.customId.startsWith('modal_final_rejeitar_parceria:') ||
            interaction.customId === 'modal_parceria'
        )
    ) {
        await handlePartnershipInteraction(context, interaction);
    }
}

module.exports = {
    handleInteraction,
};
