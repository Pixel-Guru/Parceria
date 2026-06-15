function getTeamOwnerIds(team) {
    if (!team) return [];

    if (team.ownerId) return [team.ownerId];
    if (team.members) return [...team.members.values()].map((member) => member.user.id);

    return [];
}

async function loadApplicationOwnerIds(client) {
    await client.application.fetch();
    const owner = client.application.owner;

    if (!owner) return [];
    if (owner.id) return [owner.id];

    return getTeamOwnerIds(owner);
}

module.exports = {
    loadApplicationOwnerIds,
};
