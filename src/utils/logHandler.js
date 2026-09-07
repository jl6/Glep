const path = require('path');
const db = require(path.join(process.cwd(), 'database', 'logs.js'));

async function sendLog(guild, type, embed) {
    if (!guild) return;
    const conf = db.prepare('SELECT * FROM guild_logs WHERE guild_id = ?').get(guild.id);
    if (!conf) return;

    let targetChId = null;

    if (conf.separated) {
        if (type === 'kick' && conf.kick_logs) targetChId = conf.kick_channel_id;
        else if (type === 'ban' && conf.ban_logs) targetChId = conf.ban_channel_id;
        else if (type === 'unban' && conf.unban_logs) targetChId = conf.unban_channel_id;
        else if (type === 'warn' && conf.warn_logs) targetChId = conf.warn_channel_id;
        else if (type === 'unwarn' && conf.unwarn_logs) targetChId = conf.unwarn_channel_id;
        else if (type === 'nickname' && conf.nickname_logs) targetChId = conf.nickname_channel_id;
        else if (type === 'username' && conf.username_logs) targetChId = conf.username_channel_id;
        else if (type === 'shield' && conf.shield_logs) targetChId = conf.shield_channel_id;
    } else {
        if (conf.single_channel_id) {
            const map = {
                kick: conf.kick_logs,
                ban: conf.ban_logs,
                unban: conf.unban_logs,
                warn: conf.warn_logs,
                unwarn: conf.unwarn_logs,
                nickname: conf.nickname_logs,
                username: conf.username_logs,
                shield: conf.shield_logs
            };
            if (map[type]) targetChId = conf.single_channel_id;
        }
    }

    if (!targetChId) return;
    const ch = guild.channels.cache.get(targetChId);
    if (!ch) return;

    await ch.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { sendLog };