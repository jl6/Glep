const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'daroles',
  description: 'Deletes all removable custom roles on the server.',
  usage:'confirm',
  
  async execute(msg, args, client, db) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply('Missing permissions: Administrator required.');
    }

    if (args[0]?.toLowerCase() !== 'confirm') {
      return msg.reply('This will permanently delete all eligible roles.');
    }

    const reply = await msg.reply('Scanning server roles...');

    const guild = msg.guild;
    const botMember = guild.members.me;
    const isOwner = msg.author.id === guild.ownerId;

    try {
      const roles = await guild.roles.fetch();
      let deleted = 0;
      let skipped = 0;
      let failed = 0;

      for (const [id, role] of roles) {
        if (id === guild.id || role.managed) {
          skipped++;
          continue;
        }

        if (role.position >= botMember.roles.highest.position) {
          skipped++;
          continue;
        }

        if (!isOwner && role.position >= msg.member.roles.highest.position) {
          skipped++;
          continue;
        }

        try {
          await role.delete(`Bulk purge by ${msg.author.tag}`);
          deleted++;
        } catch (err) {
          console.error(err);
          failed++;
        }
      }

      await reply.edit(`Role Cleanup Complete\n- Deleted: ${deleted}\n- Skipped: ${skipped}\n- Failed: ${failed}`);
    } catch (err) {
      console.error(err);
      await reply.edit('Failed to complete role cleanup.');
    }
  }
};