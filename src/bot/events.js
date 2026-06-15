const { ActivityType } = require('discord.js');
const { registerAllGuildCommands, registerGuildCommands } = require('./commands');
const { loadApplicationOwnerIds } = require('./owner');
const { handleInteraction } = require('../features/router');
const { handleGuildMemberRemove } = require('../features/partnerships/leaveHandler');
const { logError } = require('../utils/logger');

// Registra todos os eventos do Discord e injeta o context compartilhado.
function registerEvents(context) {
    const { client } = context;

    // Evita erro silencioso derrubando o bot sem registro.
    process.on('unhandledRejection', logError);
    process.on('uncaughtException', logError);

    client.once('ready', async () => {
        try {
            // Bootstrap do /config: antes de admins no banco, o dono da aplicacao
            // consegue abrir o painel.
            const ownerIds = await loadApplicationOwnerIds(client);
            context.applicationOwnerIds = new Set(ownerIds);

            // Comandos por servidor atualizam rapido e facilitam teste.
            await registerAllGuildCommands(client);

            client.user.setPresence({
                activities: [
                    {
                        name: 'SamBot',
                        type: ActivityType.Streaming,
                        url: 'https://discord.com/oauth2/authorize?scope=bot+applications.commands',
                    },
                ],
                status: 'online',
            });

            console.log(`Bot online como ${client.user.tag}.`);
        } catch (error) {
            logError(error);
        }
    });

    // Quando o bot entra em servidor novo, registra /config e /parceria nele.
    client.on('guildCreate', async (guild) => {
        await registerGuildCommands(guild).catch(logError);
    });

    // O router separa interacoes de configuracao e de parceria.
    client.on('interactionCreate', async (interaction) => {
        await handleInteraction(context, interaction).catch(logError);
    });

    // Se o parceiro sai, a feature apaga a postagem aprovada rastreada no Mongo.
    client.on('guildMemberRemove', async (member) => {
        await handleGuildMemberRemove(context, member).catch(logError);
    });
}

module.exports = {
    registerEvents,
};
