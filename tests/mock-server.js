/* A tiny stand-in for Supabase: serves the game files and forwards /rest/v1/rpc/<fn> calls to the local practice database as the anon role. */
const http=require('http'), fs=require('fs'), path=require('path'), {execFileSync}=require('child_process');
const ROOT=path.join(__dirname,'..'), DB=process.env.OC_DB||'onecast', PORT=+(process.env.PORT||8787);
function lit(v){ if(v===null||v===undefined) return 'null'; if(typeof v==='number'||typeof v==='boolean') return String(v); if(Array.isArray(v)) return 'array['+v.map(lit).join(',')+']::bigint[]'; if(typeof v==='object') return "'"+JSON.stringify(v).replace(/'/g,"''")+"'::jsonb"; return "'"+String(v).replace(/'/g,"''")+"'"; }
function call(fn,args){
  if(!/^[a-z_0-9]+$/.test(fn)) throw new Error('bad function');
  const named=Object.keys(args||{}).map(k=>{ if(!/^[a-z_0-9]+$/.test(k)) throw new Error('bad arg'); return k+' => '+lit(args[k]); }).join(', ');
  const q=`set role anon; select coalesce(public.${fn}(${named})::text,'null');`;
  const out=execFileSync('su',['postgres','-c',`psql -X -At -v ON_ERROR_STOP=1 -d ${DB}`],{input:q,encoding:'utf8',stdio:['pipe','pipe','pipe']});
  return out.replace(/^SET\n?/,'').trim();
}
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
http.createServer((req,res)=>{
  const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
  if(req.method==='OPTIONS'){ res.writeHead(204,cors); return res.end(); }
  const u=new URL(req.url,'http://x');
  if(u.pathname.startsWith('/rest/v1/rpc/')){ let b=''; req.on('data',d=>b+=d); req.on('end',()=>{ try{ const out=call(u.pathname.slice(13),b?JSON.parse(b):{}); res.writeHead(200,Object.assign({'Content-Type':'application/json'},cors)); res.end(out); }
    catch(e){ const m=/ERROR:\s+([^\n]+)/.exec(e.stderr||e.message); const msg=(m?m[1]:String(e.message)).trim(); if(process.env.DEBUG) console.log('RPC ERROR',u.pathname,msg); res.writeHead(400,Object.assign({'Content-Type':'application/json'},cors)); res.end(JSON.stringify({message:msg})); } }); return; }
  let p=path.normalize(path.join(ROOT,decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname))); if(!p.startsWith(ROOT)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){ res.writeHead(404); return res.end('not found'); }
  res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream','Cache-Control':'no-store'}); fs.createReadStream(p).pipe(res);
}).listen(PORT,()=>console.log('mock server on http://localhost:'+PORT));
