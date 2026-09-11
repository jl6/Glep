const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'ginvite',
  description: 'Generates or retrieves an invite link for a specified server.',
  usage: '[server_id | server_name]',

  devOnly: true,
  
  async execute(msg, args, client, db) {
    const query = args.join(' ');
    if (!query) {
      return msg.reply('Usage: ginvite <server_id | server_name>');
    }

    const guild = client.guilds.cache.get(args[0]) || 
                  client.guilds.cache.find(g => g.name.toLowerCase() === query.toLowerCase() || g.name.toLowerCase().includes(query.toLowerCase()));

    if (!guild) {
      return msg.reply('Server not found.');
    }

    try {
      let inviteUrl = null;
      const me = guild.members.me || await guild.members.fetchMe().catch(() => null);

      if (me && me.permissions.has(PermissionFlagsBits.ManageGuild)) {
        const invites = await guild.invites.fetch().catch(() => null);
        if (invites?.size > 0) {
          inviteUrl = invites.first().url;
        }
      }

      if (!inviteUrl) {
        const ch = guild.channels.cache.find(c => 
          c.isTextBased() && c.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.CreateInstantInvite)
        );

        if (!ch) {
          return msg.reply('Missing permissions to create an invite in that server.');
        }

        const invite = await ch.createInvite({
          maxAge: 86400,
          maxUses: 0,
          reason: `Requested by ${msg.author.tag}`
        });

        inviteUrl = invite.url;
      }

      const embed = new EmbedBuilder()
        .setTitle('Server Invite')
        .setColor(0x2f3136)
        .addFields(
          { name: 'Server', value: guild.name, inline: true },
          { name: 'ID', value: `\`${guild.id}\``, inline: true },
          { name: 'Members', value: `${guild.memberCount}`, inline: true },
          { name: 'Invite Link', value: inviteUrl, inline: false }
        )
        .setTimestamp();

      await msg.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await msg.reply('Failed to generate invite.');
    }
  }
};