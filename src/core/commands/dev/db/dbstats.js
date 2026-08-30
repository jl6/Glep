const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'dbstats',
  description: 'Displays a breakdown of database tables and rows.',
  selfClean: 9000,
  devOnly: true,
  
  async execute(msg, args, client, db) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply('Missing permissions: Administrator required.');
    }

    if (!db) {
      return msg.reply('Database instance not available.');
    }

    try {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
      
      if (tables.length === 0) {
        return msg.reply('The database contains no tables.');
      }

      let summary = 'Database Breakdown:\n\n';
      for (const t of tables) {
        const res = db.prepare(`SELECT COUNT(*) as count FROM "${t.name}"`).get();
        summary += `- **${t.name}**: ${res.count} rows\n`;
      }

      await msg.reply(summary);
    } catch (err) {
      console.error(err);
      await msg.reply('Failed to read database structure.');
    }
  }
};