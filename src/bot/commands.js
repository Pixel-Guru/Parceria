const COMMANDS = [
    {
        name: 'parceria',
        description: 'Publica o botao para solicitar parceria.',
    },
    {
        name: 'config',
        description: 'Abre o painel de configuracao do bot.',
    },
    {
        name: 'help',
        description: 'Mostra o guia de uso e configuracao do bot.',
    },
];

async function registerGuildCommands(guild) {
    await guild.commands.set(COMMANDS);
}

async function registerAllGuildCommands(client) {
    const guilds = [...client.guilds.cache.values()];
    await Promise.all(guilds.map((guild) => registerGuildCommands(guild)));
}

module.exports = {
    registerAllGuildCommands,
    registerGuildCommands,
};
