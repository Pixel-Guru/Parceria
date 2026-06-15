// IDs do Discord sao snowflakes numericos de 17 a 20 digitos.
function isSnowflake(value) {
    return typeof value === 'string' && /^\d{17,20}$/.test(value);
}

// Aceita IDs colados, separados por virgula ou mencionados.
function parseIdList(value) {
    if (!value) return [];
    return [...new Set(String(value).match(/\d{17,20}/g) || [])];
}

// Para campos que aceitam apenas um canal/cargo.
function parseSingleId(value) {
    return parseIdList(value)[0] || null;
}

// Preenche modals com listas ja configuradas.
function formatIdList(ids) {
    return Array.isArray(ids) && ids.length > 0 ? ids.join(', ') : '';
}

module.exports = {
    formatIdList,
    isSnowflake,
    parseIdList,
    parseSingleId,
};
