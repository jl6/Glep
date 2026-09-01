const { PermissionFlagsBits } = require('discord.js');
const db = require('../../../../database/moderation');

module.exports = {
    name: 'warn',
    description: 'Warn a member in the server',
    async execute(msg, args) {
        if (!msg.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return msg.reply('Missing permissions');
        }

        const member = msg.mentions.members.first() || msg.guild.members.cache.get(args[0]);
        if (!member) {
            return msg.reply('User not found');
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        const query = 'INSERT INTO warns (guild_id, user_id, moderator_id, reason, created_at) VALUES (?, ?, ?, ?, ?)';
        const params = [msg.guild.id, member.id, msg.author.id, reason, Date.now()];

        if (typeof db.prepare === 'function') {
            try {
                db.prepare(query).run(params);
            } catch (err) {
                console.error('Failed to log warn:', err);
            }
        } else if (typeof db.run === 'function') {
            db.run(query, params, (err) => {
                if (err) console.error('Failed to log warn:', err);
            });
        }

        msg.channel.send('User warned');
    }
};