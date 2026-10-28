/* Cache-busting: adds ?v=<content hash> to every local script and stylesheet in index.html and admin.html,
   so browsers fetch the new file right after an update instead of a stale cached copy.
   Run before committing: node tools/stamp.js */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
for (const page of ['index.html', 'admin.html']) {
  const p = path.join(ROOT, page); let html = fs.readFileSync(p, 'utf8'); let n = 0;
  html = html.replace(/(src|href)="((?:js|css)\/[^"?]+\.(?:js|css))(?:\?v=[0-9a-f]+)?"/g, (m, attr, file) => {
    const f = path.join(ROOT, file); if (!fs.existsSync(f)) return m;
    const v = crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 8); n++;
    return `${attr}="${file}?v=${v}"`;
  });
  fs.writeFileSync(p, html); console.log(page + ': stamped ' + n + ' files');
}
