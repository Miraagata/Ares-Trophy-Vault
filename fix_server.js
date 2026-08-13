const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf-8');
const fixed = content.replace(/\\n/g, '\n');
fs.writeFileSync('server.ts', fixed);
