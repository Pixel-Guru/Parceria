// Verifica se o membro tem pelo menos um dos cargos configurados.
function hasAnyRole(member, roleIds = []) {
    if (!member || !Array.isArray(roleIds)) return false;
    return roleIds.some((roleId) => member.roles.cache.has(roleId));
}

// Permissao generica: libera por usuario direto ou por cargo.
function userOrRoleAllowed(interaction, userIds = [], roleIds = []) {
    if (userIds.includes(interaction.user.id)) return true;
    return hasAnyRole(interaction.member, roleIds);
}

function isGuildOwner(interaction) {
    return interaction.guild?.ownerId === interaction.user.id;
}

function hasAdministrator(interaction) {
    return Boolean(interaction.memberPermissions?.has('Administrator'));
}

// Dono da aplicacao tem acesso permanente ao /config.
function isApplicationOwner(context, userId) {
    return context.applicationOwnerIds.has(userId);
}

// Acesso ao /config em bot publico:
// dono da aplicacao, dono do servidor, administradores do Discord e admins configurados.
function canConfigure(context, settings, interaction) {
    if (isApplicationOwner(context, interaction.user.id)) return true;
    if (isGuildOwner(interaction)) return true;
    if (hasAdministrator(interaction)) return true;

    return userOrRoleAllowed(
        interaction,
        settings?.permissions?.adminUserIds || [],
        settings?.permissions?.adminRoleIds || [],
    );
}

// Quem pode publicar o botao /parceria.
function canUsePartnershipCommand(context, settings, interaction) {
    if (canConfigure(context, settings, interaction)) return true;

    return userOrRoleAllowed(
        interaction,
        settings?.permissions?.commandUserIds || [],
        settings?.permissions?.commandRoleIds || [],
    );
}

// Quem pode fazer pre-analise.
function canPreReview(context, settings, interaction) {
    if (canConfigure(context, settings, interaction)) return true;

    return userOrRoleAllowed(
        interaction,
        settings?.permissions?.staffUserIds || [],
        settings?.permissions?.staffRoleIds || [],
    );
}

// Quem pode aprovar/rejeitar definitivamente.
function canFinalReview(context, settings, interaction) {
    if (canConfigure(context, settings, interaction)) return true;

    return userOrRoleAllowed(
        interaction,
        settings?.permissions?.finalApproverUserIds || [],
        settings?.permissions?.finalApproverRoleIds || [],
    );
}

module.exports = {
    canConfigure,
    canFinalReview,
    canPreReview,
    canUsePartnershipCommand,
    hasAdministrator,
    isApplicationOwner,
    isGuildOwner,
};
