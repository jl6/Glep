const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'nickname',
    description: 'Update or reset nicknames for one or more users.',
    usage: '@user1 @user2 ... | newnickname or reset',
    

    async execute(msg, args) {
        const targets = msg.mentions.members;
        const parts = args.join(' ').split('|');

        if (!targets.size || parts.length < 2) {
            return msg.reply('Usage: _nickname @user1 @user2 ... | <new_nickname or reset>');
        }

        const input = parts[1].trim();
        const isReset = input.toLowerCase() === 'reset';
        const newNick = isReset ? '' : input;

        if (!isReset && (!newNick || newNick.length > 32)) {
            return msg.reply('Nickname must be between 1 and 32 characters.');
        }

        let success = 0;
        let failed = 0;

        for (const [, member] of targets) {
            if (!member.manageable || (member.roles.highest.position >= msg.member.roles.highest.position && msg.guild.ownerId !== msg.author.id)) {
                failed++;
                continue;
            }

            const res = await member.setNickname(newNick).catch(() => null);
            if (res) {
                success++;
            } else {
                failed++;
            }
        }

        const targetName = isReset ? 'Default' : newNick;
        return msg.reply(`Updated ${success} nicknames. Failed or skipped: ${failed}. Name set to: ${targetName}`);
    }
};