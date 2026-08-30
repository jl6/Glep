const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'lookup',
  description: 'Look up a user by ID using the global API',
  usage: '[ID]',
  selfClean: false,
  
  async execute(msg, args, client) {
    const uid = args[0];

    if (!uid || !/^\d{17,19}$/.test(uid)) {
      return msg.reply('Invalid user ID provided.');
    }

    try {
      const u = await client.users.fetch(uid, { force: true });
      const ts = Math.floor(u.createdTimestamp / 1000);

      const embed = new EmbedBuilder()
        .setTitle(u.username)
        .setThumbnail(u.displayAvatarURL({ size: 256 }))
        .setColor(u.hexAccentColor || 0x2b2d31)
        .addFields(
          { name: 'Username', value: u.username, inline: true },
          { name: 'Display Name', value: u.globalName || 'None', inline: true },
          { name: 'ID', value: u.id, inline: true },
          { name: 'Created', value: `<t:${ts}:F> (<t:${ts}:R>)`, inline: false },
          { name: 'Type', value: u.bot ? 'Bot' : 'User', inline: true }
        )
        .setTimestamp();

      const banner = u.bannerURL({ size: 512 });
      if (banner) embed.setImage(banner);

      return msg.reply({ embeds: [embed] });
    } catch (err) {
      if (err.code === 10013) {
        return msg.reply('User not found.');
      }
      return msg.reply('Failed to fetch user data.');
    }
  }
};