const path = require('path');
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require(path.join(process.cwd(), 'database', 'moderation'));
const { sendLog } = require(path.join(process.cwd(), 'src', 'utils', 'logHandler.js'));

module.exports = {
    name: 'warn',
    description: 'Warn a member in the server',
    usage: '@user [reason]',
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

        const embed = new EmbedBuilder()
            .setTitle('User Warned')
            .setDescription(`**User:** <@${member.id}>\n**Moderator:** <@${msg.author.id}>\n**Reason:** ${reason}`)
            .setColor(0xffff00)
            .setTimestamp();
        await sendLog(msg.guild, 'warn', embed);

        msg.channel.send('User warned');
    }
};