const { EmbedBuilder } = require('discord.js');
const { extractDiscordInvite } = require('../../utils/invite');
const { truncate } = require('../../utils/text');

// Leitura defensiva de campos da embed de solicitacao.
// A solicitacao vira a "fonte de verdade" enquanto passa pela analise.
function fieldValue(embed, name) {
    return embed?.fields?.find((field) => field.name === name)?.value || null;
}

// Dados do solicitante ficam no campo "Solicitante" como tag + id.
function getRequesterIdFromEmbed(embed) {
    return fieldValue(embed, 'Solicitante')?.match(/\((\d{17,20})\)/)?.[1] || null;
}

function getRequesterLabelFromEmbed(embed) {
    return fieldValue(embed, 'Solicitante') || 'um usuario';
}

function getPartnershipTextFromEmbed(embed) {
    return fieldValue(embed, 'Texto enviado') || 'Texto nao encontrado.';
}

function getServerNameFromEmbed(embed) {
    return fieldValue(embed, 'Nome do servidor') || 'Servidor parceiro';
}

function getInviteUrlFromEmbed(embed) {
    const inviteField = fieldValue(embed, 'Convite');
    return extractDiscordInvite(inviteField || '') || extractDiscordInvite(getPartnershipTextFromEmbed(embed)) || inviteField;
}

// Detecta se a analise anterior foi uma pre-rejeicao.
// Nesse caso, aprovacao final exige motivo extra para log.
function hasPreRejection(embed) {
    const title = embed?.title?.toLowerCase() || '';
    return title.includes('pre-rejeitada') || embed?.fields?.some((field) => field.name === 'Motivo da rejeicao');
}

function getRandomColor() {
    return Math.floor(Math.random() * 0xffffff);
}

// Embed enviada para o canal de analise.
function buildRequestEmbed(interaction, formData) {
    return new EmbedBuilder()
        .setTitle('Nova solicitacao de parceria')
        .addFields(
            { name: 'Nome do servidor', value: truncate(formData.serverName, 1024) },
            { name: 'Convite', value: formData.inviteUrl },
            { name: 'Membros', value: truncate(formData.memberCount, 1024) },
            { name: 'Possui SamBot?', value: truncate(formData.hasSamBot, 1024) },
            { name: 'Texto enviado', value: truncate(formData.partnershipText, 1024) },
            { name: 'Solicitante', value: `${interaction.user.tag} (${interaction.user.id})` },
        )
        .setColor('#5805ff')
        .setFooter({ text: `Solicitante: ${interaction.user.id}` })
        .setTimestamp();
}

// Embed publica no canal de aprovados.
// O convite fica no content da mensagem para o Discord gerar o card.
function buildApprovedPostEmbed(sourceEmbed) {
    const inviteUrl = getInviteUrlFromEmbed(sourceEmbed);
    const embed = new EmbedBuilder()
        .setTitle(truncate(getServerNameFromEmbed(sourceEmbed), 256))
        .setDescription(truncate(getPartnershipTextFromEmbed(sourceEmbed), 4096))
        .setColor(getRandomColor())
        .setTimestamp();

    if (inviteUrl) embed.setURL(inviteUrl);
    return embed;
}

module.exports = {
    buildApprovedPostEmbed,
    buildRequestEmbed,
    getInviteUrlFromEmbed,
    getRequesterIdFromEmbed,
    getRequesterLabelFromEmbed,
    getServerNameFromEmbed,
    hasPreRejection,
};
