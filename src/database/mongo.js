const { MongoClient } = require('mongodb');

// Abre conexao com Mongo e prepara os indices usados pelo bot.
async function connectDatabase(uri, dbName) {
    const client = new MongoClient(uri);
    await client.connect();

    const database = client.db(dbName);

    // Um documento de configuracao por servidor.
    await database.collection('guild_settings').createIndex({ guildId: 1 }, { unique: true });

    // Consultas para apagar mensagens aprovadas quando o membro sair.
    await database.collection('approved_partnerships').createIndex({ guildId: 1, userId: 1 });

    // Evita registrar a mesma mensagem aprovada duas vezes.
    await database.collection('approved_partnerships').createIndex({ channelId: 1, messageId: 1 }, { unique: true });

    return {
        client,
        db: database,
    };
}

module.exports = {
    connectDatabase,
};
