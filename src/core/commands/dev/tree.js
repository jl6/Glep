const fs = require('fs');
const path = require('path');

const IGNORE = [
    'node_modules', '.git', '.DS_Store', 'package-lock.json', 
    'package.json', 'notes.txt', '.env', '.gitignore', 
    'readme.md', 'notes', 'LICENSE'
];

function walk(dir, prefix = '') {
    let out = '';
    const list = fs.readdirSync(dir, { withFileTypes: true })
        .filter(x => !IGNORE.includes(x.name));

    list.sort((a, b) => {
        if (a.isDirectory() === b.isDirectory()) {
            return a.name.localeCompare(b.name);
        }
        return a.isDirectory() ? -1 : 1;
    });

    list.forEach((item, idx) => {
        const isLast = idx === list.length - 1;
        const pointer = isLast ? '└── ' : '├── ';
        out += `${prefix}${pointer}${item.name}\n`;
        
        if (item.isDirectory()) {
            const nextPrefix = prefix + (isLast ? '    ' : '│   ');
            out += walk(path.join(dir, item.name), nextPrefix);
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
            const file = Buffer.from(data, 'utf-8');
            const reply = await msg.reply({
                content: 'Output exceeds message length limit. Attached as file.',
                files: [{ attachment: file, name: 'tree.txt' }]
            });

            if (this.selfClean) {
                setTimeout(() => reply.delete().catch(() => {}), this.selfClean);
            }
            return;
        }

        const reply = await msg.reply(`\`\`\`text\n${data}\`\`\``);
        
        if (this.selfClean) {
            setTimeout(() => reply.delete().catch(() => {}), this.selfClean);
        }
    }
};