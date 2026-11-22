// Copies ORI Store.html -> index.html so static hosts (Vercel) serve it at "/".
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, 'ORI Store.html');
const dst = path.join(__dirname, 'index.html');
fs.copyFileSync(src, dst);
console.log('index.html synced from ORI Store.html');
