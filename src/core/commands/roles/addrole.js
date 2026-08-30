const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'addrole',
  description: 'Assigns a role to a member.',
  usage:'@user | id | @role | id | name',
  
  async execute(msg, args, client, db) {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return msg.reply('Missing permissions: Manage Roles required.');
    }

    const memberArg = args[0];
    const roleArg = args.slice(1).join(' ');

    if (!memberArg || !roleArg) {
      return msg.reply('Usage: addrole <@user | id> <@role | id | name>');
    }

    const member = msg.mentions.members.first() || 
                   msg.guild.members.cache.get(memberArg) || 
                   await msg.guild.members.fetch(memberArg).catch(() => null);

    if (!member) {
      return msg.reply('Member not found.');
    }

    const role = msg.mentions.roles.first() || 
                 msg.guild.roles.cache.get(roleArg) || 
                 msg.guild.roles.cache.find(r => r.name.toLowerCase() === roleArg.toLowerCase());

    if (!role) {
      return msg.reply('Role not found.');
    }

    if (role.managed || role.id === msg.guild.id) {
      return msg.reply('Cannot assign this role.');
    }

    if (role.position >= msg.guild.members.me.roles.highest.position) {
      return msg.reply('Role is higher than or equal to my highest role.');
    }

    if (role.position >= msg.member.roles.highest.position && msg.author.id !== msg.guild.ownerId) {
      return msg.reply('Role is higher than or equal to your highest role.');
    }

    if (member.roles.cache.has(role.id)) {
      return msg.reply('Member already has this role.');
    }

    try {
      await member.roles.add(role);
      await msg.reply(`Added ${role.name} to ${member.user.tag}.`);
    } catch (err) {
      console.error(err);
      await msg.reply('Failed to add role.');
    }
  }
};