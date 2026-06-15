const { logError } = require('./logger');

// Responde uma interacao sem quebrar quando ela ja foi respondida/deferida.
async function replySafely(interaction, options) {
    if (interaction.replied || interaction.deferred) {
        return interaction.followUp(options).catch(logError);
    }

    return interaction.reply(options).catch(logError);
}

// DM tolerante a falha: usuario pode ter DM fechada.
async function sendDirectMessage(client, userId, content) {
    if (!userId || !content) return;

    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) return;

    await user.send(content).catch(logError);
}

// Busca canal e garante que ele aceita texto.
async function getTextChannel(client, channelId, label) {
    const channel = await client.channels.fetch(channelId).catch(logError);

    if (!channel?.isTextBased()) {
        throw new Error(`Canal invalido ou nao encontrado: ${label}`);
    }

    return channel;
}

module.exports = {
    getTextChannel,
    replySafely,
    sendDirectMessage,
};
