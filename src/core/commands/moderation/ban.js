const { PermissionFlagsBits } = require('discord.js');
const db = require('../../../../database/moderation');

module.exports = {
    name: 'ban',
    description: 'Ban a member from the server',
    usage:'@user [reason]',
    async execute(msg, args) {
        if (!msg.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return msg.reply('Missing permissions');
        }

        const member = msg.mentions.members.first() || msg.guild.members.cache.get(args[0]);
        if (!member) {
            return msg.reply('User not found');
        }

        if (!member.bannable) {
            return msg.reply('Failed to ban user');
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            await member.ban({ reason });
        } catch (err) {
            return msg.reply('Failed to ban user');
        }

        const query = 'INSERT INTO bans (guild_id, user_id, moderator_id, reason, created_at) VALUES (?, ?, ?, ?, ?)';
        const params = [msg.guild.id, member.id, msg.author.id, reason, Date.now()];

        if (typeof db.prepare === 'function') {
            try {
                db.prepare(query).run(params);
            } catch (err) {
                console.error('Failed to log ban:', err);
            }
        } else if (typeof db.run === 'function') {
            db.run(query, params, (err) => {
                if (err) console.error('Failed to log ban:', err);
            });
        }

        msg.channel.send('User banned');
    }
};