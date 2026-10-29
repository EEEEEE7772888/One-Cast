// Renders a gallery of fish art (and the Megalodon legend) to a PNG for a visual check.
const {chromium}=require('playwright'); const path=require('path');
const ids=(process.argv[2]||'').split(',').filter(Boolean), out=process.argv[3]||'/tmp/claude-0/gallery.png';
(async()=>{ const br=await chromium.launch(), p=await br.newPage({viewport:{width:1000,height:800}});
  const root='http://localhost:'+(process.env.PORT||8817); await p.goto(root+'/tests/boats.html').catch(()=>{});
  await p.setContent(`<html><body style="background:#0D2A4A;margin:0;color:#EAF5FF;font:12px monospace"><div id=g style="display:flex;flex-wrap:wrap;gap:10px;padding:10px"></div>
    <script src="${root}/js/data.js"></script><script src="${root}/js/art.js"></script><script src="${root}/js/fishart.js"></script></body></html>`);
  await p.waitForTimeout(500);
  await p.evaluate(ids=>{ const g=document.getElementById('g'); const D=window.OC, A=window.ART;
    ids.forEach(id=>{ const [sp,L,leg]=id.split(':'); const box=document.createElement('div'); box.style.cssText='background:#14385E;padding:6px;text-align:center';
      let colors=null; if(leg){ const pr=D.LEGEND_PRESETS.find(x=>x.name===leg.replace(/_/g,' ')); colors=Object.assign({name:pr.name},pr.colors); }
      const c=A.fishImg(sp,+L||40,false,3,null,colors,''); box.appendChild(c); box.appendChild(document.createElement('br')); box.appendChild(document.createTextNode((D.SP_BY_ID[sp]||{}).name+(leg?' (legend)':''))); g.appendChild(box); }); },ids);
  await p.waitForTimeout(300); await p.screenshot({path:out,fullPage:true}); await br.close(); })();
