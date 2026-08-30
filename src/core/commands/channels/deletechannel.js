const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'deletechannel',
  description: 'Deletes a channel.',
  Usage: '[#channel | ID | name]',
  selfClean: 9000,
  
  async execute(msg, args, client, db) {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return msg.reply('Missing permissions: Manage Channels required.');
    }

    const query = args.join(' ');
    if (!query) {
      return msg.reply('Usage: deletechannel <#channel | ID | name>');
    }

    const ch = msg.mentions.channels.first() || 
               msg.guild.channels.cache.get(query) || 
               msg.guild.channels.cache.find(c => c.name.toLowerCase() === query.toLowerCase());

    if (!ch) {
      return msg.reply('Channel not found.');
    }

    try {
      const name = ch.name;
      await ch.delete();
      await msg.reply(`Deleted channel: ${name}`);
    } catch (err) {
      console.error(err);
      await msg.reply('Failed to delete channel.');
    }
  }
};