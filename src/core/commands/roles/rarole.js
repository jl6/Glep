const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'pickrole',
    description: 'Randomly assign a role to a specified number of users.',
    usage: '[amount] [@role/ID]',

    async execute(msg, args) {
        if (!msg.guild) return;
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return msg.reply('Missing permissions.');

        const count = parseInt(args[0], 10);
        const roleArg = args[1];

        if (isNaN(count) || count < 1 || !roleArg) {
            return msg.reply('Usage: _pickrole [amount] [@role/ID]');
        }

        const roleId = roleArg.replace(/[<@&>]/g, '');
        const role = msg.guild.roles.cache.get(roleId) || msg.guild.roles.cache.find(r => r.name.toLowerCase() === roleArg.toLowerCase());

        if (!role) return msg.reply('Role not found.');
        if (role.position >= msg.guild.members.me.roles.highest.position) {
            return msg.reply('Role is higher than or equal to my highest role.');
        }

        await msg.guild.members.fetch();
        const candidates = msg.guild.members.cache.filter(m => !m.user.bot && !m.roles.cache.has(role.id));

        if (candidates.size === 0) return msg.reply('No eligible members found without this role.');

        const shuffled = Array.from(candidates.values()).sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, count);

        let success = 0;
        let failed = 0;

        for (const m of selected) {
            const res = await m.roles.add(role).catch(() => null);
            res ? success++ : failed++;
        }

        return msg.reply(`Assigned ${role.name} to ${success} users. Failed: ${failed}.`);
    }
};