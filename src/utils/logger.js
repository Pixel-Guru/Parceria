const fs = require('fs');
const { truncate } = require('./text');

// Log local simples para erro tecnico do bot.
function logError(error) {
    const message = error?.stack || String(error);
    console.error(error);
    fs.appendFileSync('error.log', `${new Date().toISOString()} - ${message}\n`);
}

// Log configuravel por servidor, usando o canal escolhido no /config.
async function sendGuildLog(context, guildId, payload) {
    const settings = await context.repositories.settings.get(guildId);
    const logChannelId = settings?.channels?.logChannelId;
    if (!logChannelId) return;

    const channel = await context.client.channels.fetch(logChannelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    await channel.send(payload).catch(logError);
}

// Combina log local com log no canal do servidor, quando configurado.
async function sendGuildError(context, guildId, error) {
    logError(error);
    await sendGuildLog(context, guildId, {
        content: `Aviso: erro capturado:\n\`\`\`\n${truncate(error?.stack || String(error), 1800)}\n\`\`\``,
    }).catch(logError);
}

module.exports = {
    logError,
    sendGuildError,
    sendGuildLog,
};
