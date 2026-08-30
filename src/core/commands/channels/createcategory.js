const { PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  name: 'createcategory',
  description: 'Creates a new channel category.',
  usage: '<name>',
  selfClean: 9000,
  
  async execute(msg, args, client, db) {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return msg.reply('Missing permissions: Manage Channels required.');
    }

    const name = args.join(' ');
    if (!name) {
      return msg.reply('Please provide a name for the category.');
    }

    try {
      const category = await msg.guild.channels.create({
        name: name,
        type: ChannelType.GuildCategory,
        reason: `Created by ${msg.author.tag}`
      });

      await msg.reply(`Created category: ${category.name}`);
    } catch (err) {
      console.error(err);
      await msg.reply('Failed to create category.');
    }
  }
};