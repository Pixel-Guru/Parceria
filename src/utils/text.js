// Limita textos antes de inserir em campos de embed/modal.
function truncate(text, maxLength) {
    if (!text || text.length <= maxLength) return text || 'Nao informado.';
    return `${text.slice(0, maxLength - 3)}...`;
}

// Substitui marcadores simples em DMs configuraveis: {motivo}, {servidor}, {convite}.
function formatTemplate(template, values = {}) {
    return String(template || '').replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
}

// Interpreta respostas sim/nao dos modals de configuracao.
function parseBooleanText(value, fallback = false) {
    const normalized = String(value || '').trim().toLowerCase();
    if (['sim', 's', 'yes', 'y', 'true', '1'].includes(normalized)) return true;
    if (['nao', 'não', 'n', 'no', 'false', '0'].includes(normalized)) return false;
    return fallback;
}

module.exports = {
    formatTemplate,
    parseBooleanText,
    truncate,
};
