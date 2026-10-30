/* Builds the public website (what onecast.github.io serves) from this private source:
   the same pages and files, but every script and stylesheet is minified (squished and unreadable) with a copyright notice.
   Server SQL, tests and tools stay private. Players see exactly the same game.
   Run: node tools/build-public.js <output folder>   (the output folder is a checkout of the public repo) */
const fs=require('fs'), path=require('path'), crypto=require('crypto'), {execFileSync}=require('child_process');
const ROOT=path.join(__dirname,'..'), OUT=path.resolve(process.argv[2]||path.join(ROOT,'public-build'));
const ESBUILD=process.env.ESBUILD||'/opt/npm-tools/node_modules/.bin/esbuild';
const NOTICE='/* One Cast (onecast.github.io) (c) 2026. All rights reserved. Do not copy, modify or redistribute. */';
// clear the output, but keep its .git
fs.mkdirSync(OUT,{recursive:true});
for(const f of fs.readdirSync(OUT)) if(f!=='.git') fs.rmSync(path.join(OUT,f),{recursive:true,force:true});
const copy=(rel)=>fs.cpSync(path.join(ROOT,rel),path.join(OUT,rel),{recursive:true});
['index.html','admin.html','404.html','privacy.html','support.html','manifest.webmanifest','.nojekyll','img','moved','app','.github'].forEach(r=>{ if(fs.existsSync(path.join(ROOT,r))) copy(r); });
fs.rmSync(path.join(OUT,'app','node_modules'),{recursive:true,force:true}); fs.rmSync(path.join(OUT,'app','www'),{recursive:true,force:true});
// minify scripts and styles one by one (same file names, so the pages need no other change)
function minify(rel,loader){ const src=path.join(ROOT,rel), dst=path.join(OUT,rel); fs.mkdirSync(path.dirname(dst),{recursive:true});
  execFileSync(ESBUILD,[src,'--minify','--loader:'+path.extname(rel)+'='+loader,'--target=es2017','--legal-comments=none','--banner:'+loader+'='+NOTICE,'--outfile='+dst,'--log-level=warning']); }
fs.readdirSync(path.join(ROOT,'js')).filter(f=>f.endsWith('.js')).forEach(f=>minify('js/'+f,'js'));
fs.readdirSync(path.join(ROOT,'css')).filter(f=>f.endsWith('.css')).forEach(f=>minify('css/'+f,'css'));
// fresh cache-busting tags from the minified files
for(const page of ['index.html','admin.html']){ const p=path.join(OUT,page); let h=fs.readFileSync(p,'utf8');
  h=h.replace(/(src|href)="((?:js|css)\/[^"?]+\.(?:js|css))(?:\?v=[0-9a-f]+)?"/g,(m,a,file)=>{ const f=path.join(OUT,file); if(!fs.existsSync(f)) return m; return a+'="'+file+'?v='+crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0,8)+'"'; });
  fs.writeFileSync(p,h); }
fs.writeFileSync(path.join(OUT,'README.md'),'# One Cast\n\nAn idle fishing game across the whole world. **Play:** https://onecast.github.io/\n\n(c) 2026 One Cast. All rights reserved. The code, art and content of this game may not be copied, modified, reused or redistributed without permission.\n');
fs.writeFileSync(path.join(OUT,'LICENSE'),'Copyright (c) 2026 One Cast. All rights reserved.\n\nThis repository is published only so the game can be served at https://onecast.github.io/.\nNo permission is granted to copy, modify, merge, publish, distribute, sublicense or sell any part of it.\n');
fs.writeFileSync(path.join(OUT,'.gitignore'),'node_modules/\napp/www/\n');
const n=(d)=>fs.readdirSync(d,{recursive:true}).length; console.log('public site built in',OUT,'('+n(OUT)+' files)');
