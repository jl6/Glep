const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'serverinfo',
    description: 'Displays detailed server information.',
    usage:'',
    async execute(msg, args) {
        const { guild } = msg;

        if (!msg.channel.permissionsFor(msg.client.user)?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
            return;
        }

        try {
            const members = await guild.members.fetch().catch(() => null);
            const total = guild.memberCount;
            const bots = members ? members.filter(m => m.user.bot).size : 0;
            const humans = total - bots;

            const textCh = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
            const voiceCh = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
            const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;

            const verificationLevels = {
                0: 'None',
                1: 'Low',
                2: 'Medium',
                3: 'High',
                4: 'Very High'
            };

            const embed = new EmbedBuilder()
                .setColor('Random')
                .setTitle(guild.name)
                .setThumbnail(guild.iconURL({ size: 1024 }))
                .addFields(
                    { name: 'Server ID', value: `\`${guild.id}\``, inline: true },
                    { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
                    { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: 'Members', value: `Total: **${total}**\nHumans: **${humans}**\nBots: **${bots}**`, inline: true },
                    { name: 'Channels', value: `Text: **${textCh}**\nVoice: **${voiceCh}**\nCategories: **${categories}**`, inline: true },
                    { name: 'Stats', value: `Boosts: **${guild.premiumSubscriptionCount || 0}**\nRoles: **${guild.roles.cache.size}**\nEmojis: **${guild.emojis.cache.size}**`, inline: true },
                    { name: 'Security', value: verificationLevels[guild.verificationLevel] || 'Unknown', inline: false }
                )
                .setFooter({ text: `Requested by ${msg.author.username}` })
                .setTimestamp();

            if (guild.bannerURL()) {
                embed.setImage(guild.bannerURL({ size: 1024 }));
            }

            await msg.reply({ embeds: [embed] });
        } catch (err) {
            if (err.code === 'GuildMembersTimeout' || err.message?.includes('Privileged intent')) {
                return msg.reply('Failed to fetch member list. Ensure the Server Members Intent is enabled.');
            }
            throw err;
        }
    }
};