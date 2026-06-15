// Extrai convites aceitos pelo Discord para garantir card nativo no content.
function extractDiscordInvite(text) {
    return String(text || '').match(/https?:\/\/(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/[^\s]+/i)?.[0] || null;
}

module.exports = {
    extractDiscordInvite,
};
