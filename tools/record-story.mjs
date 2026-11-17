// IG 限時動態版示範影片（1080×1920）。需求與 record-demo.mjs 相同。
// 用法：node tools/record-story.mjs zh|en → story-<lang>/，再轉檔：
// ffmpeg -framerate 30 -i story-zh/f%04d.jpg -f lavfi -i anullsrc=r=44100:cl=stereo -shortest -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -movflags +faststart pool3d-story-zh.mp4

// IG 限時動態版：540×960 CSS px × 2 = 1080×1920。上下各留 ~130px 給 IG 自己的介面。
import { chromium } from 'playwright-core';
import { mkdirSync, rmSync } from 'fs';
const LANG = process.argv[2] || 'zh', OUT = `story-${LANG}`, zh = LANG === 'zh', T = (a, b) => (zh ? a : b);
rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT);
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { localStorage.setItem('pool-settings', JSON.stringify({ tutDone: true, vol: 0 })); localStorage.setItem('pool-cfg', JSON.stringify({ opp: 'local', game: 9, race: 3, diff: 1 })); });
await ctx.clock.install();
const pg = await ctx.newPage(); pg.on('pageerror', e => console.log('ERR', e.message));
let n = 0;
const snap = async (k = 1) => { for (let i = 0; i < k; i++) { await ctx.clock.runFor(1000 / 30); await pg.screenshot({ path: `${OUT}/f${String(n++).padStart(4, '0')}.jpg`, quality: 92 }); } };
const ease = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const css = (sel, prop, v) => pg.evaluate(([s, p, v]) => document.querySelectorAll(s).forEach(e => (e.style[p] = v)), [sel, prop, v]);
const fade = async (sel, from, to, k = 8) => { for (let i = 1; i <= k; i++) { await css(sel, 'opacity', from + (to - from) * ease(i / k)); await snap(); } };
const chip = async html => { await fade('#chip', 1, 0, 5); await pg.evaluate(h => (document.getElementById('chip').innerHTML = h), html); await fade('#chip', 0, 1, 6); };
await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;overflow:hidden;background:radial-gradient(700px 900px at 50% 45%,#1d3226 0%,#0c0f0e 62%,#070808 100%);color:#f2f2ee;font-family:-apple-system,"PingFang TC",system-ui,sans-serif}
.head{position:absolute;top:128px;left:0;right:0;text-align:center}
.head h1{margin:0;font-size:44px;letter-spacing:-.01em}.head p{margin:8px 0 0;font-size:17px;color:#bfc4bd}
.box{position:absolute;left:20px;top:238px;width:500px;height:560px;border-radius:28px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.1),0 30px 80px rgba(0,0,0,.6)}
.box iframe{border:0;display:block;width:500px;height:560px}
#dip{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none}
#chip{position:absolute;left:50%;transform:translateX(-50%);top:744px;white-space:nowrap;font-weight:700;font-size:18px;background:rgba(12,14,14,.82);border:1px solid rgba(255,255,255,.16);padding:10px 18px;border-radius:999px;opacity:0;z-index:5}
#chip b{color:#6fdc9a}
#phoneWrap{position:absolute;left:0;right:0;top:238px;height:560px;opacity:0}
#phoneWrap h2{text-align:center;font-size:30px;margin:70px 0 6px}#phoneWrap p{text-align:center;color:#bfc4bd;margin:0;font-size:16px}
.phone{position:absolute;left:23px;top:200px;padding:8px 10px;background:#050505;border-radius:30px;box-shadow:0 0 0 2px #2a2c2c,0 24px 60px rgba(0,0,0,.6)}
.phone .clip{width:474px;height:219px;border-radius:22px;overflow:hidden}
.phone iframe{border:0;width:844px;height:390px;transform:scale(.5616);transform-origin:0 0}
#finger{position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;background:rgba(255,255,255,.35);border:2px solid rgba(255,255,255,.9);opacity:0;z-index:6}
.url{position:absolute;top:812px;left:0;right:0;text-align:center;font:600 15px ui-monospace,Menlo,monospace;color:#9fdcb6}
#end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0;padding:0 30px}
#end h2{font-size:34px;margin:0 0 12px;line-height:1.2}#end p{font-size:17px;color:#bfc4bd;margin:0 0 30px}
#end .u{font:700 19px ui-monospace,Menlo,monospace;color:#0b0d0d;background:#6fdc9a;padding:13px 22px;border-radius:999px}
#end small{margin-top:16px;color:#8d938b;font-size:14px}
#veil{position:absolute;inset:0;background:#000;z-index:9}
</style></head><body>
<div class="head" id="head"><h1>${T('3D 美式撞球', '3D Pool')}</h1><p>${T('打開瀏覽器就能玩・免安裝', 'Play in your browser · nothing to install')}</p></div>
<div class="box" id="gameBox"><iframe id="g" src="http://localhost:8765/?lang=${LANG}"></iframe><div id="dip"></div></div>
<div id="chip"></div>
<div id="phoneWrap"><h2>${T('手機也能玩', 'Plays on phones too')}</h2><p>${T('拖曳瞄準・下拉力道條出桿', 'Drag to aim · pull the power bar to shoot')}</p>
<div class="phone"><div class="clip"><iframe id="ph" src="http://localhost:8765/?touch&lang=${LANG}"></iframe></div></div></div>
<div id="finger"></div><iframe id="sim" src="http://localhost:8765/?lang=en&sim" style="position:absolute;left:-2000px;width:300px;height:200px;border:0"></iframe>
<div class="url" id="url">yenchiachen.github.io/pool3d</div>
<div id="end"><h2>${T('傳連結就能跟朋友<br>線上對戰', 'Send a link,<br>play a friend online')}</h2><p>${T('8 號球・9 號球・對電腦・手機電腦都能玩', '8-ball · 9-ball · vs computer · phone or desktop')}</p><div class="u">yenchiachen.github.io/pool3d</div><small>${T('連結在限動連結貼紙 ↑', 'Tap the link sticker ↑')}</small></div>
<div id="veil"></div></body></html>`);
const frameOf = id => pg.mainFrame().childFrames().find(f => f.url().includes(id === 'ph' ? 'touch' : id === 'sim' ? '&sim' : `lang=${LANG}`) && (id !== 'g' || !/touch|sim/.test(f.url())));
let g, ph, sim; for (let i = 0; i < 200 && !((g = frameOf('g')) && (ph = frameOf('ph')) && (sim = frameOf('sim'))); i++) await ctx.clock.runFor(50);
await g.waitForFunction(() => window.pool && document.getElementById('startBtn')); await ph.waitForFunction(() => window.pool && document.getElementById('startBtn'));
await ctx.clock.runFor(400);
await sim.waitForFunction(() => window.pool && document.getElementById('startBtn'));
for (const f of [g, ph, sim]) await f.evaluate(() => { document.querySelector('[data-o="local"]').click(); document.querySelector('[data-g="9"]').click(); document.getElementById('startBtn').click(); document.getElementById('cSkip')?.click(); document.getElementById('rotate')?.remove(); pool.setDemo(true); });
await g.evaluate(() => { const s = document.createElement('style'); s.textContent = '#tipBox,#hint,#topR,#modeLabel,#keyHints,#pots{display:none!important}#topC{top:12px!important}'; document.head.append(s); pool.setPitch(0.3); });
await ph.evaluate(() => pool.setPitch(0.3));
await ctx.clock.runFor(400);

// 1. 開球
const aim = f => f.evaluate(() => { const c = pool.balls[0], t = pool.balls[1]; return Math.atan2(t.z - c.z, t.x - c.x); });
const y0 = await aim(g); await g.evaluate(y => pool.setYaw(y + 0.15), y0);
await fade('#veil', 1, 0, 10);
await pg.evaluate(h => (document.getElementById('chip').innerHTML = h), T('<b>9 號球</b>開球・真實物理', '<b>9-ball</b> break · real physics')); await fade('#chip', 0, 1, 6);
for (let i = 1; i <= 22; i++) { await g.evaluate(([y, k]) => pool.setYaw(y + 0.15 * (1 - k)), [y0, ease(i / 22)]); await snap(); }
for (let i = 1; i <= 16; i++) { await g.evaluate(v => pool.charge(v), i / 16); await snap(); }
await snap(2); await g.evaluate(() => pool.fire()); await snap(26);
await g.evaluate(() => pool.setTop(true)); await chip(T('<b>俯視</b>・一鍵看全局', '<b>Top view</b> · one key'));
for (let i = 0; i < 110 && (await g.evaluate(() => pool.state)) !== 'aim'; i++) await snap();
await snap(6);

// 2. 安排好的一桿進袋
const cands = await g.evaluate(() => {
  const c = pool.balls[0], cands = [];
  for (let i = -14; i <= 14; i++) for (let j = -7; j <= 7; j++) {
    const x = i * 0.085, z = j * 0.085; if (pool.balls.some(b => b.active && b !== c && Math.hypot(b.x - x, b.z - z) < 0.12)) continue;
    const p = pool.planFrom(x, z); if (!p) continue;
    const t = pool.balls.filter(b => b.active && b.n).sort((a, b) => a.n - b.n)[0], d = Math.hypot(t.x - x, t.z - z);
    if (d < 0.4 || d > 0.95) continue;
    cands.push({ p, x, z });
  }
  return cands.sort((a, b) => b.p.score - a.p.score).slice(0, 12).map(({ p, x, z }) => ({ x, z, yaw: p.yaw, pow: Math.sqrt(Math.max(0, (p.speed - 0.1) / 7.9)) }));
});
const snapBalls = await g.evaluate(() => pool.balls.map(b => ({ x: b.x, z: b.z, a: b.active })));
let s = null;
for (const c of cands) {
  const ok = await sim.evaluate(([bs, c]) => {
    pool.balls.forEach((b, i) => { Object.assign(b, { x: bs[i].x, z: bs[i].z, active: bs[i].a, vx: 0, vz: 0, y: 0, vy: 0, wx: 0, wy: 0, wz: 0 }); });
    const t = pool.balls.filter(b => b.active && b.n).sort((a, b) => a.n - b.n)[0];
    pool.balls[0].x = c.x; pool.balls[0].z = c.z; pool.setYaw(c.yaw); pool.tip.x = 0; pool.tip.y = -0.45; pool.shoot(c.pow);
    for (let i = 0; i < 1200 && (i < 10 || pool.state === 'moving' || pool.state === 'stroke'); i++) pool.tick(1);
    return !t.active && pool.balls[0].active;
  }, [snapBalls, c]);
  if (ok) { s = c; break; }
}
console.log('sim pick', !!s); s ||= cands[0];
await g.evaluate(c => { pool.balls[0].x = c.x; pool.balls[0].z = c.z; }, s);
await fade('#dip', 0, 1, 5);
await g.evaluate(([y]) => { pool.setYaw(y - 0.22); pool.tip.y = -0.45; }, [s.yaw]); await ctx.clock.runFor(150);
await pg.evaluate(h => (document.getElementById('chip').innerHTML = h), T('<b>瞄準線</b>・走位預測・加塞', '<b>Aim line</b> · predicted paths · spin'));
await fade('#dip', 1, 0, 6);
for (let i = 1; i <= 30; i++) { await g.evaluate(([y, k]) => pool.setYaw(y - 0.22 * (1 - k)), [s.yaw, ease(i / 30)]); await snap(); }
await snap(8);
for (let i = 1; i <= 14; i++) { await g.evaluate(v => pool.charge(v), (s.pow * i) / 14); await snap(); }
await snap(2); const before = await g.evaluate(() => pool.balls.filter(b => b.active).length); await g.evaluate(() => pool.fire());
for (let i = 0; i < 110 && (i < 10 || (await g.evaluate(() => pool.state)) === 'moving'); i++) await snap();
console.log('potted', before - (await g.evaluate(() => pool.balls.filter(b => b.active).length)));
await snap(8);

// 3. 手機版
await fade('#chip', 1, 0, 5);
const py = await aim(ph); await ph.evaluate(y => pool.setYaw(y - 0.16), py);
for (let i = 1; i <= 9; i++) { const k = ease(i / 9); await css('#gameBox', 'opacity', 1 - k); await css('#phoneWrap', 'opacity', k); await snap(); }
const finger = (x, y, o) => pg.evaluate(([x, y, o]) => { const f = document.getElementById('finger'); f.style.left = x + 'px'; f.style.top = y + 'px'; f.style.opacity = o; }, [x, y, o]);
const PX = 33, PY = 238 + 208, SC = 0.5616;          // 手機畫面左上角在頁面上的位置與縮放
for (let i = 1; i <= 24; i++) { const k = ease(i / 24); await ph.evaluate(([y, k]) => pool.setYaw(y - 0.16 * (1 - k)), [py, k]); await finger(PX + (300 + 170 * k) * SC, PY + 220 * SC, 0.95); await snap(); }
const r = await ph.evaluate(() => { const b = document.getElementById('tpowKnob').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, h: document.querySelector('#tpow .tt').clientHeight }; });
await finger(PX + r.x * SC, PY + r.y * SC, 0.95); await snap(4);
for (let i = 1; i <= 16; i++) { const k = ease(i / 16); await ph.evaluate(v => pool.charge(v), k); await finger(PX + r.x * SC, PY + (r.y + r.h * 0.9 * k) * SC, 0.95); await snap(); }
await snap(2); await ph.evaluate(() => pool.fire()); await finger(0, 0, 0); await snap(50);

// 4. 結尾
for (let i = 1; i <= 10; i++) { const k = ease(i / 10); for (const id of ['#phoneWrap', '#head', '#url']) await css(id, 'opacity', 1 - k); await snap(); }
await fade('#end', 0, 1, 10); await snap(70);
console.log('frames', n, (n / 30).toFixed(1) + 's');
await b.close();
