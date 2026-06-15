const { Client, GatewayIntentBits } = require('discord.js');

function createClient() {
    return new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.GuildMembers,
        ],
        partials: ['CHANNEL'],
    });
}

module.exports = {
    createClient,
};
