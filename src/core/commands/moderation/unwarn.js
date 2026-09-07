const path = require('path');
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require(path.join(process.cwd(), 'database', 'moderation'));
const { sendLog } = require(path.join(process.cwd(), 'src', 'utils', 'logHandler.js'));

module.exports = {
    name: 'unwarn',
    description: 'Remove warnings from a user',
    usage: '[user] [count|all] [reason]',
    async execute(msg, args) {
        if (!msg.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return msg.reply('Missing permissions');
        }

        const member = msg.mentions.members.first() || msg.guild.members.cache.get(args[0]);
        if (!member) {
            return msg.reply('User not found');
        }

        const countArg = args[1];
        const removeAll = countArg === 'all';
        const removeCount = removeAll ? null : parseInt(countArg, 10);

        if (!removeAll && (isNaN(removeCount) || removeCount <= 0)) {
            return msg.reply('Invalid warning count');
        }

        const reasonStartIndex = 2;
        const reason = args.slice(reasonStartIndex).join(' ') || 'No reason provided';

        const selectQuery = removeAll 
            ? 'SELECT id FROM warns WHERE guild_id = ? AND user_id = ?' 
            : 'SELECT id FROM warns WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT ?';
        
        const selectParams = removeAll ? [msg.guild.id, member.id] : [msg.guild.id, member.id, removeCount];

        if (typeof db.prepare === 'function') {
            try {
                const stmt = db.prepare(selectQuery);
                const rows = removeAll ? stmt.all(msg.guild.id, member.id) : stmt.all(msg.guild.id, member.id, removeCount);
                
                if (!rows || rows.length === 0) {
                    return msg.reply('Failed to remove warnings');
                }

                const ids = rows.map(r => r.id);
                const placeholders = ids.map(() => '?').join(',');
                
                db.prepare(`DELETE FROM warns WHERE id IN (${placeholders})`).run(...ids);

                db.prepare(
                    'INSERT INTO unwarns (guild_id, user_id, moderator_id, count, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)'
                ).run(msg.guild.id, member.id, msg.author.id, ids.length, reason, Date.now());

                const embed = new EmbedBuilder()
                    .setTitle('Warnings Removed')
                    .setDescription(`**User:** <@${member.id}>\n**Moderator:** <@${msg.author.id}>\n**Warnings Removed:** ${ids.length}\n**Reason:** ${reason}`)
                    .setColor(0x00ffff)
                    .setTimestamp();
                await sendLog(msg.guild, 'unwarn', embed);

                msg.channel.send(`Removed ${ids.length} warnings`);
            } catch (err) {
                console.error('Failed to process unwarn:', err);
                return msg.reply('Failed to remove warnings');
            }
        } else {
            msg.reply('Failed to remove warnings');
        }
    }
};