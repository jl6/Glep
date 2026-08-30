const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));

const handleCommand = async (msg, client) => {
    if (msg.author.bot || !msg.guild) return;

    let pfx = process.env.PREFIX || '!';
    const row = db.prepare('SELECT prefix FROM guild_settings WHERE guild_id = ?').get(msg.guild.id);
    if (row?.prefix) pfx = row.prefix;

    if (!msg.content.startsWith(pfx)) return;

    const args = msg.content.slice(pfx.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();
    const cmd = client.commands.get(cmdName);
    if (!cmd) return;

    const specialIds = process.env.SPECIAL_IDS?.split(',').map(id => id.trim()) || [];
    const devIds = process.env.DEV_IDS?.split(',').map(id => id.trim()) || [];

    const isSpecial = specialIds.includes(msg.author.id);
    const isDev = devIds.includes(msg.author.id);

    if ((cmd.specialOnly && !isSpecial) || (cmd.devOnly && !isSpecial && !isDev)) {
        const warning = await msg.reply('Restricted command.');
        setTimeout(async () => {
            try {
                if (msg.deletable) await msg.delete();
                if (warning.deletable) await warning.delete();
            } catch {}
        }, 3000);
        return;
    }

    try {
        const res = await cmd.execute(msg, args, client);

        if (cmd.selfClean) {
            const delay = typeof cmd.selfClean === 'number' ? cmd.selfClean : 5000;
            setTimeout(async () => {
                try {
                    if (msg.deletable) await msg.delete();
                    if (res && typeof res.delete === 'function' && res.deletable) await res.delete();
                } catch {}
            }, delay);
        }
    } catch (err) {
        console.error(err);
        await msg.reply('Error executing command.');
    }
};

module.exports = { handleCommand };