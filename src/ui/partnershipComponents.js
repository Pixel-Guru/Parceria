const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');

// Botao publicado pelo /parceria para os membros abrirem o formulario.
function buildRequestButton(settings) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('partnership:request')
            .setLabel(settings.texts.partnershipButtonLabel || 'Realizar parceria')
            .setStyle(ButtonStyle.Success),
    );
}

// Primeira etapa de analise: staff recomenda aprovar ou rejeitar.
function buildPreReviewRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('partnership:pre_approve')
            .setLabel('Pre-aprovar')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('partnership:pre_reject')
            .setLabel('Pre-rejeitar')
            .setStyle(ButtonStyle.Danger),
    );
}

// Segunda etapa: aprovadores finais encerram a solicitacao.
function buildFinalReviewRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('partnership:final_approve')
            .setLabel('Aprovar definitivamente')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('partnership:final_reject')
            .setLabel('Rejeitar definitivamente')
            .setStyle(ButtonStyle.Danger),
    );
}

// Formulario enviado pelo parceiro.
// O Discord permite no maximo 5 inputs por modal, por isso todos os campos
// essenciais ficam aqui.
function buildPartnershipFormModal() {
    const modal = new ModalBuilder()
        .setCustomId('partnership:submit')
        .setTitle('Formulario de parceria');

    const serverNameInput = new TextInputBuilder()
        .setCustomId('server_name')
        .setLabel('Nome do servidor')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Digite o nome do servidor')
        .setRequired(true)
        .setMaxLength(100);

    const inviteInput = new TextInputBuilder()
        .setCustomId('invite_link')
        .setLabel('Link de convite')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://discord.gg/seuconvite')
        .setRequired(true)
        .setMaxLength(120);

    const memberCountInput = new TextInputBuilder()
        .setCustomId('member_count')
        .setLabel('Quantidade de membros')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: 1700')
        .setRequired(true)
        .setMaxLength(30);

    const hasSamBotInput = new TextInputBuilder()
        .setCustomId('has_sambot')
        .setLabel('Ja possui o SamBot no servidor?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('sim/nao')
        .setRequired(true)
        .setMaxLength(10);

    const textInput = new TextInputBuilder()
        .setCustomId('partnership_text')
        .setLabel('Texto da parceria')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Digite o texto que sera exibido na parceria')
        .setRequired(true)
        .setMaxLength(1000);

    modal.addComponents(
        new ActionRowBuilder().addComponents(serverNameInput),
        new ActionRowBuilder().addComponents(inviteInput),
        new ActionRowBuilder().addComponents(memberCountInput),
        new ActionRowBuilder().addComponents(hasSamBotInput),
        new ActionRowBuilder().addComponents(textInput),
    );

    return modal;
}

// Modal generico para motivos de rejeicao/pre-rejeicao/aprovacao apos rejeicao.
function buildReasonModal({ customId, title, label, placeholder, inputId = 'reason' }) {
    const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle(title);

    const reasonInput = new TextInputBuilder()
        .setCustomId(inputId)
        .setLabel(label)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(placeholder)
        .setRequired(true)
        .setMaxLength(1000);

    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    return modal;
}

module.exports = {
    buildFinalReviewRow,
    buildPartnershipFormModal,
    buildPreReviewRow,
    buildReasonModal,
    buildRequestButton,
};
