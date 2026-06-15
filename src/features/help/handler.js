const { EmbedBuilder } = require('discord.js');

function buildHelpEmbed(guildName = 'Servidor') {
    return new EmbedBuilder()
        .setTitle(`${guildName} | Ajuda do sistema de parcerias`)
        .setColor('#7c5cff')
        .setDescription([
            '**O que este bot faz?**',
            'Ele recebe pedidos de parceria, manda para a staff analisar, publica parcerias aprovadas e remove o post se o parceiro sair do servidor.',
            '',
            '**Comandos principais**',
            '`/config` abre o painel de configuracao.',
            '`/parceria` publica o botao que os membros usam para enviar parceria.',
            '`/help` mostra esta ajuda.',
            '',
            '**Ordem recomendada para configurar**',
            '1. **Canais**: canal de analise, canal de aprovados e canal de logs.',
            '2. **Cargos**: cargo que o parceiro ganha e cargo marcado no post aprovado.',
            '3. **Equipe**: quem faz a pre-analise.',
            '4. **Aprovadores**: quem toma a decisao final.',
            '5. **/parceria**: quem pode publicar o botao de solicitacao.',
            '6. **DMs/Textos**: mensagens enviadas e frase do post aprovado.',
            '7. **Outros**: liga/desliga de regras.',
            '',
            '**Como pegar IDs**',
            'Ative o modo desenvolvedor no Discord, clique com o botao direito em canal/cargo/usuario e copie o ID.',
            '',
            '**Fluxo da parceria**',
            'Membro envia formulario -> staff pre-aprova ou pre-rejeita -> aprovador final aprova ou rejeita -> bot envia DM e registra tudo.',
        ].join('\n'))
        .setFooter({ text: 'Dica: comece pelo /config e configure Canais primeiro.' })
        .setTimestamp();
}

async function handleHelpInteraction(interaction) {
    const guildName = interaction.guild?.name || 'Servidor';

    await interaction.reply({
        embeds: [buildHelpEmbed(guildName)],
        ephemeral: true,
    });
}

module.exports = {
    handleHelpInteraction,
};
