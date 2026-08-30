const fs = require('fs');
const path = require('path');

const IGNORE = ['node_modules', '.git', '.DS_Store', 'package-lock.json', 'package.json', 'notes.txt', '.env','.gitignore', 'readme.md', 'notes', 'LICENSE'];

function walk(dir, prefix = '') {
    let out = '';
    const list = fs.readdirSync(dir, { withFileTypes: true }).filter(x => !IGNORE.includes(x.name));

    list.sort((a, b) => a.isDirectory() === b.isDirectory() ? a.name.localeCompare(b.name) : a.isDirectory() ? -1 : 1);

    list.forEach((item, i) => {
        const last = i === list.length - 1;
        out += `${prefix}${last ? '└── ' : '├── '}${item.name}\n`;
        if (item.isDirectory()) {
            out += walk(path.join(dir, item.name), prefix + (last ? '    ' : '│   '));
        }
    });

    return out;
}

module.exports = {
    name: 'tree',
    description: 'Displays the project directory structure.',
    selfClean: 45000,
    devOnly: true,
    async execute(msg, args) {
        const root = process.cwd();
        const data = `${path.basename(root)}/\n` + walk(root);

        if (data.length > 1900) {
            return msg.reply('Output too large.');
        }

        const reply = await msg.reply(`\`\`\`text\n${data}\`\`\``);
        
        if (this.selfClean) {
            setTimeout(() => reply.delete().catch(() => {}), this.selfClean);
        }
    }
};