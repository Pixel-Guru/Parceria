const { logError } = require('../../utils/logger');

// Quando um parceiro sai do servidor, apagamos as mensagens aprovadas dele
// se esse comportamento estiver ligado no painel.
async function handleGuildMemberRemove(context, member) {
    const settings = await context.repositories.settings.get(member.guild.id);
    if (!settings?.behavior?.removeApprovedOnLeave) return;

    const records = await context.repositories.approvedPartnerships.findByUser(member.guild.id, member.id);

    // Cada registro aponta para uma mensagem publicada no canal de aprovados.
    for (const record of records) {
        try {
            const channel = await context.client.channels.fetch(record.channelId);
            const message = await channel.messages.fetch(record.messageId);
            await message.delete();
            await context.repositories.approvedPartnerships.removeByMessage(record.channelId, record.messageId);
        } catch (error) {
            // 10008 = mensagem desconhecida. Se ja foi apagada, remove so o registro.
            if (error.code === 10008) {
                await context.repositories.approvedPartnerships.removeByMessage(record.channelId, record.messageId);
            } else {
                logError(error);
            }
        }
    }
}

module.exports = {
    handleGuildMemberRemove,
};
