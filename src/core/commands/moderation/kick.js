const path = require('path');
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require(path.join(process.cwd(), 'database', 'moderation'));
const { sendLog } = require(path.join(process.cwd(), 'src', 'utils', 'logHandler.js'));

module.exports = {
    name: 'kick',
    description: 'Kick a member from the server',
    usage: '@user [reason]',
    async execute(msg, args) {
        if (!msg.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return msg.reply('Missing permissions');
        }

        const member = msg.mentions.members.first() || msg.guild.members.cache.get(args[0]);
        if (!member) {
            return msg.reply('User not found');
        }

        if (!member.kickable) {
            return msg.reply('Failed to kick user');
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            await member.kick(reason);
        } catch (err) {
            return msg.reply('Failed to kick user');
        }

        const query = 'INSERT INTO kicks (guild_id, user_id, moderator_id, reason, created_at) VALUES (?, ?, ?, ?, ?)';
        const params = [msg.guild.id, member.id, msg.author.id, reason, Date.now()];

        if (typeof db.prepare === 'function') {
            try {
                db.prepare(query).run(params);
            } catch (err) {
                console.error('Failed to log kick:', err);
            }
        } else if (typeof db.run === 'function') {
            db.run(query, params, (err) => {
                if (err) console.error('Failed to log kick:', err);
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('User Kicked')
            .setDescription(`**User:** <@${member.id}> (${member.user.tag})\n**Moderator:** <@${msg.author.id}>\n**Reason:** ${reason}`)
            .setColor(0xffaa00)
            .setTimestamp();
        await sendLog(msg.guild, 'kick', embed);

        msg.channel.send('User kicked');
    }
};