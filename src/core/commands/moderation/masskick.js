const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'masskick',
    description: 'Kick up to 400 members while protecting a specified role',
    usage: '[role_id_or_mention] [reason]',

    async execute(msg, args) {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply('Missing permissions');

        const roleArg = args[0];
        const role = msg.mentions.roles.first() || msg.guild.roles.cache.get(roleArg);
        if (!role) return msg.reply('Protected role not found');

        const reason = args.slice(1).join(' ') || 'Mass kick execution';

        try {
            await msg.guild.members.fetch();
            const targets = msg.guild.members.cache.filter(m => m.kickable && !m.roles.cache.has(role.id) && m.id !== msg.client.user.id).first(400);
            
            if (!targets.length) return msg.reply('No kickable members found');

            let count = 0;
            for (const mem of targets) {
                try {
                    await mem.kick(reason);
                    count++;
                } catch (err) {}
            }

            msg.channel.send(`Kicked ${count} members`);
        } catch (err) {
            msg.reply('Failed to execute mass kick');
        }
    }
};