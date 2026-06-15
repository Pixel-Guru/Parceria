const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

// Loader simples de .env para desenvolvimento local.
// Na host, as variaveis reais do ambiente continuam tendo prioridade.
function loadLocalEnv() {
    const envPath = path.resolve(__dirname, '../../.env');
    if (!fs.existsSync(envPath)) return;

    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex === -1) continue;

        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim();

        if (key && process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

// Configuracao minima que ainda fica fora do Mongo.
// Tudo operacional do servidor e salvo pelo painel em guild_settings.
function loadRuntimeConfig() {
    loadLocalEnv();

    const token = process.env.DISCORD_TOKEN || config.token;
    const mongoUri = process.env.MONGODB_URI;
    const mongoDbName = process.env.MONGODB_DB_NAME || 'partnership_bot';

    // Token pode vir da host ou do config.json.
    if (!token) {
        throw new Error('Token do Discord nao configurado. Defina DISCORD_TOKEN ou token no config.json.');
    }

    // Mongo e obrigatorio porque configuracoes e mensagens rastreadas vivem no banco.
    if (!mongoUri) {
        throw new Error('MongoDB nao configurado. Defina MONGODB_URI na host antes de iniciar o bot.');
    }

    return {
        token,
        mongoUri,
        mongoDbName,
    };
}

module.exports = {
    loadRuntimeConfig,
};
