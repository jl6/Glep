const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'invite',
    description: 'Generates an invite link for the bot.',
    usage: '',
    selfClean: 30000,
    async execute(msg, args, client) {
        const perms = [
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.KickMembers,
            PermissionFlagsBits.BanMembers,
            PermissionFlagsBits.ModerateMembers,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageNicknames
        ];

        const link = client.generateInvite({
            scopes: ['bot'],
            permissions: perms
        });

        const embed = new EmbedBuilder()
            .setTitle('Add Glep')
            .setDescription('Click the button below to add this bot to your server.')
            .setColor(0x2f3136);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Invite Link')
                .setURL(link)
                .setStyle(ButtonStyle.Link)
        );

        await msg.reply({ embeds: [embed], components: [row] });
    }
};