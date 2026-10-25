/* QA walkthrough: a brand-new player on a computer and on a phone. Screenshots every screen, logs errors and layout problems.
   Usage: OC_DB=qa PORT=8795 node tests/mock-server.js &  then  node tests/qa.js  (screens go to tests/out/qa/) */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const BASE = 'http://localhost:8795', OUT = path.join(__dirname, 'out', 'qa');
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const sql = q => execFileSync('su', ['postgres', '-c', 'psql -X -At -d qa'], { input: q, encoding: 'utf8' }).trim();
const notes = [];
const note = (dev, s) => { notes.push('[' + dev + '] ' + s); console.log('[' + dev + '] ' + s); };

async function run(dev, viewport, mobile) {
  const ctx = await (await chromium.launch()).newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await ctx.route('https://fonts.gstatic.com/**', r => r.fulfill({ status: 404, body: '' }));
  const page = await ctx.newPage();
  page.on('pageerror', e => note(dev, 'PAGE ERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts/.test(m.text())) note(dev, 'CONSOLE: ' + m.text()); });
  let n = 0; const shot = async name => { await page.waitForTimeout(350); await page.screenshot({ path: path.join(OUT, dev + '-' + String(++n).padStart(2, '0') + '-' + name + '.png') }); };
  const overflow = async where => {
    const bad = await page.evaluate(() => { const out = []; document.querySelectorAll('.overlay:not([hidden]) *, .panel *, .hud *').forEach(e => { const r = e.getBoundingClientRect(); if (!r.width || getComputedStyle(e).overflowX === 'auto' || getComputedStyle(e).overflowY === 'auto') return; if (e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0 && getComputedStyle(e).overflow !== 'visible') out.push((e.id || e.className || e.tagName) + ' text cut: "' + (e.textContent || '').trim().slice(0, 40) + '"'); if (r.right > innerWidth + 1 && r.width < innerWidth) out.push((e.id || e.className || e.tagName) + ' runs off the right edge'); }); return [...new Set(out)].slice(0, 6); });
    bad.forEach(b => note(dev, where + ': ' + b));
    const hscroll = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (hscroll) note(dev, where + ': page scrolls sideways');
  };
  const click = async (sel, label) => { const el = page.locator(sel).first(); if (!(await el.count()) || !(await el.isVisible())) { note(dev, 'could not find/see ' + (label || sel)); return false; } await el.click(); await page.waitForTimeout(400); return true; };

  await page.addInitScript(() => { window.__toasts = []; new MutationObserver(() => { const t = document.getElementById('toast'); if (t && !t.hidden && t.textContent && window.__toasts[window.__toasts.length - 1] !== t.textContent) window.__toasts.push(Math.round(performance.now() / 100) / 10 + 's ' + t.textContent); }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true }); });
  await page.goto(BASE + '/?server=' + BASE + '&key=test'); await page.waitForTimeout(1200);
  await shot('first-load'); await overflow('first load');
  if (!(await page.locator('#nameOv').isVisible())) note(dev, 'name screen did not appear for a new player');
  await page.fill('#nameIn', 'QA' + dev); await shot('name-typed');
  await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
  await shot('start'); await overflow('start');
  const coach = await page.locator('#coach').isVisible(); if (!coach) note(dev, 'tutorial box not showing at start');
  const pid = await page.evaluate(() => G.s.pid);
  note(dev, 'starting coins: ' + await page.evaluate(() => G.s.coins));
  const cb = await page.locator('#coach').boundingBox(); if (cb) note(dev, 'tutorial box size: ' + Math.round(cb.width) + 'x' + Math.round(cb.height) + ' on a ' + viewport.width + 'x' + viewport.height + ' screen');
  // cast with worms
  await click('#castBtn, button:has-text("CAST")', 'CAST button'); await page.waitForTimeout(800); await shot('after-cast'); await overflow('after cast');
  sql(`update lines set bite_at=now()-interval '3 seconds', cast_at=now()-interval '5 minutes' where pid='${pid}'`);
  await page.evaluate(() => G.refresh(true)); await page.waitForTimeout(1200); await shot('bite');
  await click('button:has-text("REEL")', 'REEL button'); await page.waitForTimeout(2500); await shot('catch-card'); await overflow('catch card');
  const coinsBefore = await page.evaluate(() => G.s.coins);
  if (await click('#cardOv button:has-text("SELL")', 'SELL on catch card')) { await page.waitForTimeout(800);
    if (await page.locator('#confirmOv').isVisible()) { note(dev, 'selling the first fish asked "are you sure" (' + (await page.locator('#confirmOv').innerText()).replace(/\s+/g, ' ').slice(0, 90) + ')'); await page.locator('#confirmOv button').last().click(); await page.waitForTimeout(1000); } }
  const coinsAfter = await page.evaluate(() => G.s.coins);
  if (!(coinsAfter > coinsBefore)) note(dev, 'selling from the catch card did not add coins (' + coinsBefore + ' -> ' + coinsAfter + ')');
  await shot('after-sell'); await overflow('after sell');
  await page.waitForTimeout(3500); await shot('after-sell-wait');
  note(dev, 'tutorial step after selling: ' + (await page.evaluate(() => (G.s.prefs.tut || 0))) + ', coach text: ' + (await page.locator('#coachTxt').textContent()).slice(0, 60));
  // give coins to explore shops
  sql(`update players set coins=20000 where pid='${pid}'`); await page.evaluate(() => G.refresh(true)); await page.waitForTimeout(800);
  const screens = [['menuOv', 'menu'], ['baitOv', 'bait-shop'], ['gearOv', 'gear-shop'], ['dockOv', 'dock'], ['shopOv', 'clothes'], ['bucketOv', 'your-fish'], ['journalOv', 'journal'], ['legendOv', 'legends'], ['boardOv', 'leaderboard'], ['friendsOv', 'friends'], ['newsOv', 'news'], ['achOv', 'achievements'], ['saveOv', 'save-code'], ['helpOv', 'how-to-play'], ['mapOv', 'map']];
  for (const [id, name] of screens) {
    try { await page.evaluate(id => UI.open(id), id); } catch (e) { note(dev, 'opening ' + name + ' failed: ' + e.message); continue; }
    await page.waitForTimeout(500); await shot(name); await overflow(name);
    if (name === 'gear-shop') { const t = await page.locator('#gearOv').innerText(); if (!/1,250/.test(t)) note(dev, 'gear shop does not show the third line at $1,250'); }
    await page.evaluate(id => { document.getElementById(id).hidden = true; }, id);
  }
  // buy minnows and a second line through the real buttons
  await page.evaluate(() => UI.open('baitOv')); await page.waitForTimeout(400);
  const buyBait = page.locator('#baitOv button.pbtn.gold:not([disabled])').first();
  if (await buyBait.count()) { const c0 = await page.evaluate(() => G.s.coins); await buyBait.click(); await page.waitForTimeout(600); await shot('buy-bait-confirm'); if (await page.locator('#confirmOv').isVisible()) await page.locator('#confirmOv button').last().click(); await page.waitForTimeout(900); await shot('bought-bait'); note(dev, 'bait purchase: coins ' + c0 + ' -> ' + await page.evaluate(() => G.s.coins)); } else note(dev, 'no BUY button in bait shop');
  await page.evaluate(() => { document.getElementById('baitOv').hidden = true; UI.open('gearOv'); }); await page.waitForTimeout(400);
  const buyGear = page.locator('#gearOv button.pbtn.gold:not([disabled])').first();
  if (await buyGear.count()) { const c0 = await page.evaluate(() => G.s.coins); await buyGear.click(); await page.waitForTimeout(600); if (await page.locator('#confirmOv').isVisible()) await page.locator('#confirmOv button').last().click(); await page.waitForTimeout(900); await shot('bought-gear'); note(dev, 'gear purchase: coins ' + c0 + ' -> ' + await page.evaluate(() => G.s.coins) + ', lines ' + await page.evaluate(() => G.s.gear.lines)); } else note(dev, 'no BUY button in gear shop');
  await page.evaluate(() => { document.getElementById('gearOv').hidden = true; });
  // travel on the map to another home lake
  await page.evaluate(() => UI.open('mapOv')); await page.waitForTimeout(500);
  const ok = await page.evaluate(() => { const els = [...document.querySelectorAll('#mapOv *')].filter(e => /^\s*Farm Pond/i.test(e.textContent) && e.children.length < 4); const b = els.find(e => e.onclick) || els.map(e => e.closest('[class]')).find(e => e && e.onclick) || els[0]; if (b) { b.click(); return true; } return false; });
  await page.waitForTimeout(600); await shot('map-spot');
  const go = page.locator('#mapOv button:has-text("TRAVEL HERE")').first();
  if (ok && await go.count()) { await go.click(); await page.waitForTimeout(3500); await shot('traveled'); note(dev, 'spot after travel: ' + await page.evaluate(() => G.s.spot)); }
  else note(dev, 'could not travel from the map by clicking (pin found: ' + ok + ')');
  note(dev, 'messages shown: ' + (await page.evaluate(() => window.__toasts)).join(' | '));
  // reload: does the player come back?
  await page.reload(); await page.waitForTimeout(2000); await shot('reloaded');
  if (await page.locator('#nameOv').isVisible()) note(dev, 'after reload the game asked for a name again');
  await ctx.browser().close();
}
(async () => {
  await run('pc', { width: 1366, height: 768 }, false);
  await run('phone', { width: 390, height: 844 }, true);
  fs.writeFileSync(path.join(OUT, 'notes.txt'), notes.join('\n'));
})();
