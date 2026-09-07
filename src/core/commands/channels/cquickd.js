const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'cquickd',
  description: 'Quickly delete the current channel.',
  usage: '',
  
  async execute(msg, args, client, db) {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return msg.reply('Missing permissions.');
    }

    if (!msg.channel.deletable) {
      return msg.reply('I cannot delete this channel.');
    }

    try {
      await msg.channel.delete();
    } catch (err) {
      console.error('Failed to quick-delete channel:', err);
  
      if (msg.channel) {
        await msg.reply('Failed to delete channel.').catch(() => {});
      }
    }
  }
};