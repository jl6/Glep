const { checkShield } = require('../../../../utils/shieldHandler');
const { checkSelfBot } = require('../../../../utils/selfbotHandler');
const { handleCommand } = require('../../../../utils/commandHandler');
const { handleCustomCommand } = require('../../../../utils/costumecHandler');
const { checkSticky } = require('../../../../utils/stickyHandler');
const afkHandler = require('../../../../utils/afkHandler');

module.exports = {
    name: 'messageCreate',
    async execute(msg, client) {
        if (!msg.guild || msg.author.bot) return;
        if (await checkShield(msg)) return;
        if (await checkSelfBot(msg)) return;
        await checkSticky(msg);
        await afkHandler(msg);
        if (await handleCustomCommand(msg)) return;
        await handleCommand(msg, client);
    }
};