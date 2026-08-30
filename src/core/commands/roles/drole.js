const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'drole',
  description: 'Deletes a role from the server.',
  usage:'@role | id | name',
  
  async execute(msg, args, client, db) {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return msg.reply('Missing permissions: Manage Roles required.');
    }

    const query = args.join(' ');
    if (!query) {
      return msg.reply('Usage: deleterole <@role | id | name>');
    }

    const role = msg.mentions.roles.first() || 
                 msg.guild.roles.cache.get(query) || 
                 msg.guild.roles.cache.find(r => r.name.toLowerCase() === query.toLowerCase());

    if (!role) {
      return msg.reply('Role not found.');
    }

    if (role.id === msg.guild.id) {
      return msg.reply('Cannot delete the @everyone role.');
    }

    if (role.managed || role.tags?.premiumSubscriberRole) {
      return msg.reply('Cannot delete a managed or integration role.');
    }

    if (role.position >= msg.guild.members.me.roles.highest.position) {
      return msg.reply('Role is higher than or equal to my highest role.');
    }

    if (role.position >= msg.member.roles.highest.position && msg.author.id !== msg.guild.ownerId) {
      return msg.reply('Role is higher than or equal to your highest role.');
    }

    try {
      const name = role.name;
      await role.delete(`Deleted by ${msg.author.tag}`);
      await msg.reply(`Deleted role: ${name}`);
    } catch (err) {
      console.error(err);
      await msg.reply('Failed to delete role.');
    }
  }
};