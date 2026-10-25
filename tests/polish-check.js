const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch(); const errs=[]; const p=await b.newPage({viewport:{width:1100,height:800}}); p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8787/?server=http://localhost:8787&key=test'); await p.waitForTimeout(700); await p.fill('#nameIn','Polish'); await p.click('#nameGo'); await p.waitForTimeout(1300); await p.evaluate(()=>G.prefs({tut:9})); await p.evaluate(()=>G.updateCoach());
 await p.screenshot({path:'tests/out/pol-scene.png'});
 await p.evaluate(()=>{ var pr=OC.LEGEND_PRESETS.filter(x=>x.name==='The Swamp King')[0]; UI.showCard({sp:'muskie',lb:90,inches:72,legend:7,legendName:'The Swamp King',colors:pr.colors,bait:'mullet',period:'dusk',minutes:410,value:0,legendInfo:{clue:pr.clue}}); });
 await p.waitForTimeout(900); await p.screenshot({path:'tests/out/pol-card.png'});
 await p.evaluate(()=>{ document.getElementById('cardOv').hidden=true; UI.open('legendOv'); }); await p.waitForTimeout(1200); await p.screenshot({path:'tests/out/pol-legends.png'});
 console.log(errs.join('\n')||'no errors'); await b.close(); })();
