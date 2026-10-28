/* Builds a test copy of the game in beta/ that talks to a separate test server and keeps its own save.
   Run: node tools/make-beta.js <test project url> <test publishable key>
   The live game is not touched; beta/ is a self-contained copy of index.html, admin.html, js, css and img. */
const fs=require('fs'), path=require('path');
const [url,key]=process.argv.slice(2); if(!url||!key){ console.error('usage: node tools/make-beta.js <url> <publishable key>'); process.exit(1); }
const ROOT=path.join(__dirname,'..'), OUT=path.join(ROOT,'beta');
fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT);
function copyDir(a,b){ fs.mkdirSync(b,{recursive:true}); for(const f of fs.readdirSync(a)){ const s=path.join(a,f), d=path.join(b,f); fs.statSync(s).isDirectory()?copyDir(s,d):fs.copyFileSync(s,d); } }
['js','css','img'].forEach(d=>copyDir(path.join(ROOT,d),path.join(OUT,d)));
const inject=`<meta name="robots" content="noindex"><script>window.OC_SERVER_OVERRIDE=${JSON.stringify({url,key,store:'beta'})};</script>`;
const banner=`<div style="position:fixed;left:50%;top:0;transform:translateX(-50%);z-index:99999;background:#E5484D;color:#fff;font:8px/1 'Press Start 2P',monospace;padding:4px 8px;border-radius:0 0 4px 4px;pointer-events:none">TEST VERSION</div>`;
for(const page of ['index.html','admin.html']){
  let h=fs.readFileSync(path.join(ROOT,page),'utf8');
  h=h.replace('<head>','<head>'+inject).replace(/<body([^>]*)>/,'<body$1>'+banner);
  h=h.replace(/<link rel="manifest"[^>]*>/,''); // not installable: it is just for testing
  fs.writeFileSync(path.join(OUT,page),h);
}
console.log('beta/ built for',url);
