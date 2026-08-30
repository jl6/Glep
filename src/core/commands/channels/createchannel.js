const { PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  name: 'createchannel',
  description: 'Creates a text or voice channel.',
  selfClean: 9000,
  
  async execute(msg, args, client, db) {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return msg.reply('Missing permissions: Manage Channels required.');
    }

    const type = args[0]?.toLowerCase();
    const name = args[1];
    const catName = args.slice(2).join(' ');

    if (!type || !name || !['text', 'voice'].includes(type)) {
      return msg.reply('Usage: createchannel <text|voice>');
    }

    const channelType = type === 'text' ? ChannelType.GuildText : ChannelType.GuildVoice;
    let parentId = null;

    if (catName) {
      const cat = msg.guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === catName.toLowerCase()
      );
      if (cat) parentId = cat.id;
    }

    try {
      const ch = await msg.guild.channels.create({
        name,
        type: channelType,
        parent: parentId,
        reason: `Created by ${msg.author.tag}`
      });

      await msg.reply(`Created ${type} channel: ${ch}`);
    } catch (err) {
      console.error(err);
      await msg.reply('Failed to create channel.');
    }
  }
};