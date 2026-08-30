const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'userinfo',
  description: 'Displays detailed information about a server member.',
  usage: '[@member | ID]',
  selfClean: false,
  
  async execute(msg, args) {
    let member = msg.mentions.members.first();

    if (!member && args[0]) {
      try {
        member = await msg.guild.members.fetch(args[0]);
      } catch {
        member = null;
      }
    }

    if (!member) {
      member = msg.member;
    }

    const u = member.user;
    const createdTs = Math.floor(u.createdTimestamp / 1000);
    const joinedTs = member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;

    const msInDay = 1000 * 60 * 60 * 24;
    const createdDaysAgo = Math.floor((Date.now() - u.createdTimestamp) / msInDay);
    const createdYearsAgo = (createdDaysAgo / 365.25).toFixed(1);

    const joinedDaysAgo = member.joinedTimestamp 
      ? Math.floor((Date.now() - member.joinedTimestamp) / msInDay) 
      : null;
    const joinedYearsAgo = joinedDaysAgo ? (joinedDaysAgo / 365.25).toFixed(1) : null;

    const roles = member.roles.cache
      .filter(r => r.id !== msg.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => r.name);

    const embed = new EmbedBuilder()
      .setColor(member.displayHexColor === '#000000' ? '#2b2d31' : member.displayHexColor)
      .setThumbnail(u.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'User', value: `${u.username} (${u.id})`, inline: false },
        { name: 'Registered', value: `<t:${createdTs}:F>\n${createdDaysAgo} days ago (${createdYearsAgo} years ago)`, inline: false },
        { name: 'Joined', value: joinedTs ? `<t:${joinedTs}:F>\n${joinedDaysAgo} days ago (${joinedYearsAgo} years ago)` : 'Unknown', inline: false },
        { name: 'Roles', value: roles.length ? roles.join(', ') : 'None', inline: false }
      )
      .setFooter({ text: `Requested by ${msg.author.username}` })
      .setTimestamp();

    return msg.reply({ embeds: [embed] });
  }
};