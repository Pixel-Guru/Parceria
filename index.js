const { createClient } = require('./src/bot/client');
const { registerEvents } = require('./src/bot/events');
const { loadRuntimeConfig } = require('./src/config/runtime');
const { connectDatabase } = require('./src/database/mongo');
const { createRepositories } = require('./src/database/repositories');

// Ponto de entrada do bot.
// cria o client e entrega o restante para os modulos em src/.
async function main() {
    // Valida token e MONGODB_URI antes de tentar logar no Discord.
    const runtime = loadRuntimeConfig();

    // O banco fica no context por meio dos repositorios.
    const database = await connectDatabase(runtime.mongoUri, runtime.mongoDbName);
    const repositories = createRepositories(database);
    const client = createClient();

    // applicationOwnerIds e preenchido no ready, depois que o Discord informa
    // quem e o dono da aplicacao.
    registerEvents({
        client,
        database,
        repositories,
        runtime,
        applicationOwnerIds: new Set(),
    });

    await client.login(runtime.token);
}

// Falhas de boot aparecem no terminal da host com mensagem direta.
main().catch((error) => {
    console.error('Falha ao iniciar o bot:', error);
    process.exitCode = 1;
});