const { createDefaultGuildSettings, isPartnershipConfigured } = require('../config/defaultSettings');
const { mergeDeep } = require('../utils/object');

// Normaliza documentos vindos do Mongo com defaults atuais.
// Isso permite adicionar campos novos sem migrar manualmente todos os servidores.
function normalizeSettings(settings) {
    const { _id, ...settingsWithoutMongoId } = settings;
    const normalized = mergeDeep(createDefaultGuildSettings(settings.guildId), settingsWithoutMongoId);
    normalized.setupComplete = isPartnershipConfigured(normalized);
    return normalized;
}

// guild_settings guarda tudo que antes ficava no config.json:
// canais, cargos, permissoes, textos e comportamento.
function createSettingsRepository(database) {
    const collection = database.db.collection('guild_settings');

    return {
        // Busca sem criar. Usado quando uma feature precisa saber se ja existe setup.
        async get(guildId) {
            const settings = await collection.findOne({ guildId });
            return settings ? normalizeSettings(settings) : null;
        },

        // Primeiro acesso ao /config cria um documento vazio com defaults.
        async getOrCreate(guildId) {
            const existing = await this.get(guildId);
            if (existing) return existing;

            const settings = createDefaultGuildSettings(guildId);
            await collection.insertOne(settings);
            return normalizeSettings(settings);
        },

        // Aplica patch parcial preservando os outros blocos da configuracao.
        async update(guildId, patch) {
            const current = await this.getOrCreate(guildId);
            const next = normalizeSettings(mergeDeep(current, patch));
            next.updatedAt = new Date();

            await collection.updateOne(
                { guildId },
                { $set: next },
                { upsert: true },
            );

            return next;
        },
    };
}

// approved_partnerships substitui o antigo arquivo local.
// Ele registra quais mensagens aprovadas pertencem a cada solicitante.
function createApprovedPartnershipsRepository(database) {
    const collection = database.db.collection('approved_partnerships');

    return {
        // Salva ou atualiza o rastreio da mensagem aprovada.
        async add(record) {
            await collection.updateOne(
                { channelId: record.channelId, messageId: record.messageId },
                {
                    $set: {
                        ...record,
                        createdAt: record.createdAt || new Date(),
                    },
                },
                { upsert: true },
            );
        },

        // Usado quando o membro sai do servidor.
        async findByUser(guildId, userId) {
            return collection.find({ guildId, userId }).toArray();
        },

        // Remove o rastreio depois que a mensagem foi apagada ou ja nao existe.
        async removeByMessage(channelId, messageId) {
            await collection.deleteOne({ channelId, messageId });
        },
    };
}

// Fabrica unica para montar os repositorios usados pelo context.
function createRepositories(database) {
    return {
        settings: createSettingsRepository(database),
        approvedPartnerships: createApprovedPartnershipsRepository(database),
    };
}

module.exports = {
    createRepositories,
};
