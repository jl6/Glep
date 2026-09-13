const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'nickname',
    description: 'Update or reset nicknames for one or more users.',
    usage: '@user1 / ID1 | newnickname or reset',

    async execute(msg, args) {
        if (!msg.guild) return;
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageNicknames)) return msg.reply('Missing permissions.');

        const fullArgs = args.join(' ');
        const parts = fullArgs.split('|');
        if (parts.length < 2) return msg.reply('Invalid format. Use | to separate targets and nickname.');

        const targetPart = parts[0].trim();
        const input = parts[1].trim();
        const isReset = input.toLowerCase() === 'reset';
        const newNick = isReset ? '' : input;

        if (!isReset && (newNick.length < 1 || newNick.length > 32)) {
            return msg.reply('Nickname must be between 1 and 32 characters.');
        }

        const rawIds = targetPart.match(/\d{17,19}/g) || [];
        const mentionIds = Array.from(msg.mentions.members.keys());
        const allIds = Array.from(new Set([...rawIds, ...mentionIds]));

        if (!allIds.length) return msg.reply('No valid users provided.');

        const members = await Promise.all(
            allIds.map(id => msg.guild.members.fetch(id).catch(() => null))
        );

        const validMembers = members.filter(m => m !== null);
        if (!validMembers.length) return msg.reply('Could not resolve any members.');

        let success = 0;
        let failed = 0;

        for (const m of validMembers) {
            if (!m.manageable || (m.roles.highest.position >= msg.member.roles.highest.position && msg.guild.ownerId !== msg.author.id)) {
                failed++;
                continue;
            }

            const res = await m.setNickname(newNick).catch(() => null);
            res ? success++ : failed++;
        }

        const targetName = isReset ? 'Default' : newNick;
        return msg.reply(`Updated ${success} nicknames. Failed or skipped: ${failed}. Name set to: ${targetName}`);
    }
};