
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'avatar',
    description: 'Displays a user avatar.',
    async execute(msg, args) {
        if (!msg.channel.permissionsFor(msg.client.user)?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
            return;
        }

        const target = msg.mentions.users.first() || 
                       msg.client.users.cache.get(args[0]) || 
                       msg.author;

        const member = await msg.guild.members.fetch(target.id).catch(() => null);
        const globalAvatar = target.displayAvatarURL({ size: 4096 });

        const embed = new EmbedBuilder()
            .setColor('Random')
            .setTitle(`Avatar: ${target.username}`)
            .setImage(globalAvatar)
            .setTimestamp();

        if (member?.avatar) {
            const serverAvatar = member.displayAvatarURL({ size: 4096 });
            embed.setDescription(`[Global Avatar](${globalAvatar}) | [Server Avatar](${serverAvatar})`);
        } else {
            embed.setDescription(`[Global Avatar](${globalAvatar})`);
        }

        await msg.reply({ embeds: [embed] }).catch(() => {});
    }
};