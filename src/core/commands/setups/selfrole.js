const { PermissionFlagsBits, RoleSelectMenuBuilder, ActionRowBuilder } = require('discord.js');

module.exports = {
    name: 'srole',
    description: 'Create a self role station',
    usage:'Title \n\n you can also add emojis to the buttons',
    async execute(msg, args) {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return msg.reply('Missing permissions: Manage Roles required.');
        }

        const title = args.join(' ');
        if (!title) {
            return msg.reply('Usage: !srole [Title]');
        }

        const menu = new RoleSelectMenuBuilder()
            .setCustomId('autorole_setup_select')
            .setPlaceholder('Select up to 10 roles for the station')
            .setMinValues(1)
            .setMaxValues(10);

        const row = new ActionRowBuilder().addComponents(menu);

        await msg.reply({
            content: title,
            components: [row]
        });
    }
};