const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'createrole',
  description: 'Creates a new role.',
  usage: '[NAME]',
  
  async execute(msg, args, client, db) {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return msg.reply('Missing permissions: Manage Roles required.');
    }

    const name = args.join(' ');
    if (!name) {
      return msg.reply('Usage: createrole <name>');
    }

    try {
      const role = await msg.guild.roles.create({
        name,
        colors: { primaryColor: Math.floor(Math.random() * 0xffffff) },
        reason: `Created by ${msg.author.tag}`
      });

      await msg.reply(`Created role: ${role} (\`${role.id}\`)`);
    } catch (err) {
      console.error(err);
      await msg.reply('Failed to create role.');
    }
  }
};