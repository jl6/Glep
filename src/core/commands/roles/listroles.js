const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'lroles',
  description: 'Displays a list of all server roles ordered by hierarchy.',
  usage:'',
  
  async execute(msg, args, client, db) {
    if (!msg.guild) return;

    try {
      const roles = await msg.guild.roles.fetch();
      const sortedRoles = Array.from(roles.values()).sort((a, b) => b.position - a.position);
      const totalRoles = sortedRoles.length;

      const roleEntries = sortedRoles.map(role => `${role} — \`${role.id}\``);

      let description = '';
      for (let i = 0; i < roleEntries.length; i++) {
        const entry = roleEntries[i] + '\n';
        if ((description + entry).length > 3800) {
          const truncated = totalRoles - i;
          description += `\n...and ${truncated} more roles.`;
          break;
        }
        description += entry;
      }

      const embed = new EmbedBuilder()
        .setTitle(`Server Roles (${totalRoles})`)
        .setDescription(description || 'No roles found.')
        .setColor(0x2f3136)
        .setTimestamp();

      await msg.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await msg.reply('Failed to list roles.');
    }
  }
};