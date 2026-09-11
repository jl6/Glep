const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

module.exports = {
  name: 'servers',
  description: 'Lists all servers the bot is in.',
  usage:'',
  devOnly: true,
  
  async execute(msg, args, client, db) {
    let statusMsg = null;
    
    try {
      statusMsg = await msg.reply('Fetching server list...');

      const fetchedGuilds = await client.guilds.fetch();
      const guildsArray = Array.from(fetchedGuilds.values());

      if (guildsArray.length === 0) {
        return await statusMsg.edit('No active servers found.');
      }

      const guildDataArray = await Promise.all(
        guildsArray.map(async (guildBase) => {
          try {
            const fullGuild = await guildBase.fetch();
            const owner = await client.users.fetch(fullGuild.ownerId).catch(() => null);
            return {
              success: true,
              name: fullGuild.name,
              id: fullGuild.id,
              ownerTag: owner ? owner.tag : 'Unknown',
              ownerId: fullGuild.ownerId,
              memberCount: fullGuild.memberCount
            };
          } catch (err) {
            return {
              success: false,
              name: guildBase.name,
              id: guildBase.id
            };
          }
        })
      );

      const embedEntries = [];
      let fullTxtReport = `Server List\n`;
      fullTxtReport += `Generated: ${new Date().toLocaleString()}\n`;
      fullTxtReport += `Total Servers: ${guildsArray.length}\n`;
      fullTxtReport += `${'='.repeat(40)}\n\n`;

      for (const data of guildDataArray) {
        if (data.success) {
          embedEntries.push(
            `**${data.name}** (\`${data.id}\`)\n` +
            `• Owner: ${data.ownerTag} (\`${data.ownerId}\`)\n` +
            `• Members: ${data.memberCount}`
          );

          fullTxtReport += `Server Name: ${data.name}\n`;
          fullTxtReport += `Server ID:   ${data.id}\n`;
          fullTxtReport += `Owner Tag:   ${data.ownerTag}\n`;
          fullTxtReport += `Owner ID:    ${data.ownerId}\n`;
          fullTxtReport += `Members:     ${data.memberCount}\n`;
        } else {
          embedEntries.push(`**${data.name}** (\`${data.id}\`)\n• Failed to fetch details.`);
          fullTxtReport += `Server Name: ${data.name} [Failed to fetch]\n`;
          fullTxtReport += `Server ID:   ${data.id}\n`;
        }
        fullTxtReport += `${'-'.repeat(40)}\n`;
      }

      const embeds = [];
      let currentDesc = '';

      for (const entry of embedEntries) {
        if ((currentDesc + entry + '\n\n').length > 3800) {
          embeds.push(currentDesc.trim());
          currentDesc = entry + '\n\n';
        } else {
          currentDesc += entry + '\n\n';
        }
      }
      
      if (currentDesc.trim().length > 0) {
        embeds.push(currentDesc.trim());
      }

      if (embeds.length <= 10) {
        const embedPayload = embeds.map((desc, index) => {
          const eb = new EmbedBuilder()
            .setColor(0x2f3136)
            .setDescription(desc);

          if (index === 0) {
            eb.setTitle(`Servers (${guildsArray.length})`)
              .setThumbnail(client.user.displayAvatarURL());
          }

          if (embeds.length > 1) {
            eb.setFooter({ text: `Page ${index + 1} of ${embeds.length}` });
          }

          return eb;
        });

        await statusMsg.delete().catch(() => {});
        return await msg.channel.send({ embeds: embedPayload });
      }

      const buffer = Buffer.from(fullTxtReport, 'utf-8');
      const attachment = new AttachmentBuilder(buffer, { name: 'server_list.txt' });

      const summaryEmbed = new EmbedBuilder()
        .setTitle('Servers')
        .setColor(0x2f3136)
        .setDescription(`Total Servers: ${guildsArray.length}\nList exceeds embed limits. Attached file generated.`)
        .setTimestamp();

      await statusMsg.delete().catch(() => {});
      return await msg.channel.send({
        embeds: [summaryEmbed],
        files: [attachment]
      });

    } catch (err) {
      console.error(err);
      if (statusMsg) await statusMsg.delete().catch(() => {});
      return await msg.reply('Failed to fetch server list.');
    }
  }
};