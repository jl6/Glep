const { PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'wipedb',
  description: 'Wipes the entire database.',
  selfClean: 9000,
  devOnly: true,
  
  async execute(msg, args, client, db) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply('Missing permissions: Administrator required.');
    }

    const dbPath = path.join(__dirname, '../../../../../database/data.db');

    try {
      if (fs.existsSync(dbPath)) {
        if (db && typeof db.close === 'function') {
          db.close();
        }
        
        fs.unlinkSync(dbPath);
        fs.writeFileSync(dbPath, '');
        
        await msg.reply('Database wiped successfully.');
      } else {
        await msg.reply('Database file not found.');
      }
    } catch (err) {
      console.error(err);
      await msg.reply('Failed to wipe database.');
    }
  }
};