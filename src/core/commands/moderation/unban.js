const { PermissionFlagsBits } = require('discord.js');
const db = require('../../../../database/moderation');

module.exports = {
    name: 'unban',
    description: 'Unban a user from the server',
    usage:'userID [reason]',

    async execute(msg, args) {
        if (!msg.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return msg.reply('Missing permissions');
        }

        const userId = args[0];
        if (!userId || isNaN(userId)) {
            return msg.reply('User not found');
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            await msg.guild.members.unban(userId, reason);
        } catch (err) {
            return msg.reply('Failed to unban user');
        }

        const query = 'INSERT INTO unbans (guild_id, user_id, moderator_id, reason, created_at) VALUES (?, ?, ?, ?, ?)';
        const params = [msg.guild.id, userId, msg.author.id, reason, Date.now()];

        if (typeof db.prepare === 'function') {
            try {
                db.prepare(query).run(params);
            } catch (err) {
                console.error('Failed to log unban:', err);
            }
        } else if (typeof db.run === 'function') {
            db.run(query, params, (err) => {
                if (err) console.error('Failed to log unban:', err);
            });
        }

        msg.channel.send('User unbanned');
    }
};