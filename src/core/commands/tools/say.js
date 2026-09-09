const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'say',
    description: 'Repeat text',
    usage: '[message]',

    async execute(msg, args) {
        if (!msg.guild) return;
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return msg.reply('Missing permissions.');
        }

        const text = args.join(' ');
        if (!text) return msg.reply('Usage: say [message]');

        msg.delete().catch(() => {});
        await msg.channel.send(text).catch(() => {});
    }
};