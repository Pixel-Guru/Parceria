const { ActivityType } = require('discord.js');

function normalizeStatus(status) {
    return ['online', 'idle', 'dnd', 'invisible'].includes(status) ? status : 'online';
}

function applyPresence(client, settings) {
    const name = settings?.texts?.presenceName || 'SamBot';
    const url = settings?.texts?.presenceUrl || 'https://discord.com/oauth2/authorize?scope=bot+applications.commands';
    const status = normalizeStatus(settings?.texts?.presenceStatus || 'online');

    client.user.setPresence({
        activities: [
            {
                name,
                type: ActivityType.Streaming,
                url,
            },
        ],
        status,
    });
}

module.exports = {
    applyPresence,
};
