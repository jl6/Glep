const path = require('path');
const db = require(path.resolve(__dirname, '../../database/db'));

async function handleCustomCommand(msg) {
    const prefix = msg.client.prefix || '_';
    if (!msg.content.startsWith(prefix)) return false;

    const args = msg.content.slice(prefix.length).trim().split(/ +/);
    const name = args.shift().toLowerCase();

  
    if (msg.client.commands.has(name)) return false;

    const customCmds = db.get(`custom_cmds_${msg.guild.id}`) || {};
    if (customCmds[name]) {
        await msg.channel.send(customCmds[name]);
        return true;
    }

    return false;
}

module.exports = { handleCustomCommand };