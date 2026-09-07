const path = require('path');
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require(path.join(process.cwd(), 'database', 'moderation'));
const { sendLog } = require(path.join(process.cwd(), 'src', 'utils', 'logHandler.js'));

module.exports = {
    name: 'ban',
    description: 'Ban a member from the server',
    usage: '@user [reason]',
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

        const embed = new EmbedBuilder()
            .setTitle('User Banned')
            .setDescription(`**User:** <@${member.id}> (${member.user.tag})\n**Moderator:** <@${msg.author.id}>\n**Reason:** ${reason}`)
            .setColor(0xff0000)
            .setTimestamp();
        await sendLog(msg.guild, 'ban', embed);

        msg.channel.send('User banned');
    }
};