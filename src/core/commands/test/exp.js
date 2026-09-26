const MurmurHash3 = require('imurmurhash');

module.exports = {
    name: 'uexp',
    description: 'Calculate Discord experiment rollout percentage',
    usage: '<experiment-id> [@user]',
    async execute(msg, args) {
        const experimentId = args[0];
        if (!experimentId) {
            return msg.reply('Usage: `!uexp <experiment-id> [@user]`\nExample: `!uexp 2026-09-badge-hiding`');
        }

        const targetUser = msg.mentions.users.first() || msg.author;
        
        
        const hashInput = `${experimentId}:${targetUser.id}`;
        const hashVal = MurmurHash3(hashInput).result();
        const bucketVal = hashVal % 10_000;
        const percentage = ((bucketVal / 10_000) * 100).toFixed(2);

        let txt = `Result for <@${targetUser.id}> on \`${experimentId}\`:\n`;
        txt += `• **Your Hash Score:** \`${percentage}%\` (Bucket: \`${bucketVal}/10000\`)\n\n`;
        txt += `**How to evaluate:**\n`;
        txt += `• Check the active rollout percentage for this experiment from your source.\n`;
        txt += `• If the rollout percentage is **equal to or higher than ${percentage}%**, you have access.\n`;
        txt += `• If it is lower, you are outside the current rollout window.`;

        return msg.reply(txt);
    }
};