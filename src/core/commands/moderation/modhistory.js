const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../../../database/moderation');

module.exports = {
    name: 'modhistory',
    description: 'View moderation history for a user',
    async execute(msg, args) {
        if (!msg.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return msg.reply('Missing permissions');
        }

        const targetUser = msg.mentions.users.first();
        const targetId = targetUser ? targetUser.id : (args[0] ? args[0].replace(/[^0-9]/g, '') : null);

        if (!targetId) {
            return msg.reply('User not found');
        }

        const query = `
            SELECT 'Kick' as type, moderator_id, reason, created_at FROM kicks WHERE guild_id = ? AND user_id = ?
            UNION ALL
            SELECT 'Ban' as type, moderator_id, reason, created_at FROM bans WHERE guild_id = ? AND user_id = ?
            UNION ALL
            SELECT 'Warn' as type, moderator_id, reason, created_at FROM warns WHERE guild_id = ? AND user_id = ?
            ORDER BY created_at DESC
        `;
        const params = [msg.guild.id, targetId, msg.guild.id, targetId, msg.guild.id, targetId];

        const buildEmbed = (rows) => {
            const embed = new EmbedBuilder()
                .setTitle('Moderation History')
                .setDescription(`History for <@${targetId}>`)
                .setColor(0x2f3136);

            const fields = rows.slice(0, 25).map(r => {
                const date = new Date(r.created_at).toUTCString();
                return {
                    name: `${r.type}`,
                    value: `Moderator: <@${r.moderator_id}>\nReason: ${r.reason}\nDate: ${date}`,
                    inline: false
                };
            });

            embed.addFields(fields);
            return embed;
        };

        if (typeof db.all === 'function') {
            db.all(query, params, (err, rows) => {
                if (err) {
                    console.error('Failed to fetch mod history:', err);
                    return msg.reply('Failed to fetch history');
                }

                if (!rows || rows.length === 0) {
                    return msg.reply('No moderation history found for this user');
                }

                const embed = buildEmbed(rows);
                msg.channel.send({ embeds: [embed] });
            });
        } else if (typeof db.prepare === 'function') {
            try {
                const rows = db.prepare(query).all(...params);

                if (!rows || rows.length === 0) {
                    return msg.reply('No moderation history found for this user');
                }

                const embed = buildEmbed(rows);
                msg.channel.send({ embeds: [embed] });
            } catch (err) {
                console.error('Failed to fetch mod history:', err);
                return msg.reply('Failed to fetch history');
            }
        } else {
            msg.reply('Failed to fetch history');
        }
    }
};