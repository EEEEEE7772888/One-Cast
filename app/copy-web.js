/* Copies the game (the same files as onecast.github.io) into www/ for the app. The admin page and tests stay out. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'www');
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
for (const f of ['index.html', 'manifest.webmanifest']) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
for (const d of ['css', 'js', 'img']) fs.cpSync(path.join(ROOT, d), path.join(OUT, d), { recursive: true });
console.log('copied the game into', OUT);
