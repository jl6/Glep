const { checkShield } = require('../../../../utils/shieldHandler');
const { checkSelfBot } = require('../../../../utils/selfbotHandler');
const { checkAutoRespond } = require('../../../../utils/autorespondHandler');
const { handleCommand } = require('../../../../utils/commandHandler');
const { handleCustomCommand } = require('../../../../utils/costumecHandler');
const { checkSticky } = require('../../../../utils/stickyHandler');
const afkHandler = require('../../../../utils/afkHandler');
const levelingHandler = require('../../../../utils/levelingHandler');

module.exports = {
    name: 'messageCreate',
    async execute(msg, client) {
        if (!msg.guild || msg.author.bot) return;
        if (await checkShield(msg)) return;
        if (await checkSelfBot(msg)) return;
        if (await checkAutoRespond(msg)) return;
        await checkSticky(msg);
        await afkHandler(msg);
        await levelingHandler(msg);
        if (await handleCustomCommand(msg)) return;
        await handleCommand(msg, client);
    }
};