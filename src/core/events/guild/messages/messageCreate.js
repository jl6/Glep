const { checkShield } = require('../../../../../src/utils/shieldHandler');
const { checkSelfBot } = require('../../../../../src/utils/selfbotHandler');
const { handleCommand } = require('../../../../../src/utils/commandHandler');

module.exports = {
    name: 'messageCreate',
    async execute(msg, client) {
        if (!msg.guild || msg.author.bot) return;
        if (await checkShield(msg)) return;
        if (await checkSelfBot(msg)) return;
        await handleCommand(msg, client);
    }
};