const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { usage } = require('./rrole');

const KEY_PERMISSIONS = [
  'Administrator',
  'ManageGuild',
  'ManageRoles',
  'ManageChannels',
  'KickMembers',
  'BanMembers',
  'ModerateMembers',
  'ManageMessages',
  'MentionEveryone',
  'ViewAuditLog'
];

module.exports = {
  name: 'roleinfo',
  description: 'Displays detailed metadata and permissions for a role.',
  usage:'@role | id | name',
  
  async execute(msg, args, client, db) {
    if (!msg.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return msg.reply('Missing permissions: Moderate Members required.');
    }

    let role = msg.mentions.roles.first();

    if (!role && args.length > 0) {
      const query = args.join(' ').toLowerCase();
      role = msg.guild.roles.cache.get(args[0]) ||
             msg.guild.roles.cache.find(r => r.name.toLowerCase() === query) ||
             msg.guild.roles.cache.find(r => r.name.toLowerCase().includes(query));
    }

    if (!role) {
      return msg.reply('Usage: roleinfo <@role | id | name>');
    }

    const createdTimestamp = Math.floor(role.createdTimestamp / 1000);
    const rolePermissions = role.permissions.toArray();
    let keyPermsFormatted = 'None';

    if (role.permissions.has(PermissionFlagsBits.Administrator)) {
      keyPermsFormatted = '`Administrator` (Grants all permissions)';
    } else {
      const matchedKeyPerms = rolePermissions.filter(p => KEY_PERMISSIONS.includes(p));
      keyPermsFormatted = matchedKeyPerms.length > 0 
        ? matchedKeyPerms.map(p => `\`${p}\``).join(', ') 
        : 'Basic Member Permissions';
    }

    const embed = new EmbedBuilder()
      .setTitle(`Role Info: ${role.name}`)
      .setColor(role.hexColor !== '#000000' ? role.hexColor : 0x2f3136)
      .addFields(
        { name: 'Name', value: `${role}`, inline: true },
        { name: 'ID', value: `\`${role.id}\``, inline: true },
        { name: 'Color', value: `\`${role.hexColor.toUpperCase()}\``, inline: true },
        { name: 'Position', value: `\`#${msg.guild.roles.cache.size - role.position}\` of \`${msg.guild.roles.cache.size}\``, inline: true },
        { name: 'Members', value: `\`${role.members.size}\``, inline: true },
        { name: 'Managed', value: role.managed ? 'Yes' : 'No', inline: true },
        { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
        { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
        { name: 'Created', value: `<t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)`, inline: false },
        { name: 'Key Permissions', value: keyPermsFormatted, inline: false }
      )
      .setTimestamp();

    if (role.iconURL()) {
      embed.setThumbnail(role.iconURL({ size: 256 }));
    }

    await msg.reply({ embeds: [embed] });
  }
};