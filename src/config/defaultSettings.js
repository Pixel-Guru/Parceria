// Documento inicial de configuracao por servidor.
// O painel /config preenche esses blocos aos poucos.
function createDefaultGuildSettings(guildId) {
    return {
        guildId,
        setupComplete: false,
        channels: {
            logChannelId: null,
            partnershipChannelId: null,
            approvedPartnershipChannelId: null,
        },
        roles: {
            partnerRoleId: null,
            approvedMentionRoleIds: [],
        },
        permissions: {
            adminUserIds: [],
            adminRoleIds: [],
            staffUserIds: [],
            staffRoleIds: [],
            finalApproverUserIds: [],
            finalApproverRoleIds: [],
            commandUserIds: [],
            commandRoleIds: [],
        },
        texts: {
            partnershipButtonLabel: 'Realizar parceria',
            submissionReceivedDm: 'Sua solicitacao de parceria foi enviada para moderacao. Aguarde a aprovacao.',
            approvedDm: 'Sua parceria foi aprovada! O convite foi publicado no canal de servidores verificados.',
            rejectedDm: 'Sua solicitacao de parceria foi rejeitada.\n\nMotivo: {motivo}\n\nVoce pode revisar as informacoes e tentar novamente.',
            verifiedPhrase: '✦ Este servidor está no Programa de Servidores Verificados do Sam',
        },
        behavior: {
            allowPublicSubmissions: true,
            removeApprovedOnLeave: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

// Setup minimo para o fluxo de parceria funcionar.
function isPartnershipConfigured(settings) {
    return Boolean(
        settings?.channels?.partnershipChannelId &&
        settings?.channels?.approvedPartnershipChannelId,
    );
}

module.exports = {
    createDefaultGuildSettings,
    isPartnershipConfigured,
};
