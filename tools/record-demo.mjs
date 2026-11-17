// 錄 README 的示範影片：用 Playwright 假時鐘一格一格推進遊戲並截圖，所以畫面一定順。
// 需要：Google Chrome、ffmpeg、npm i playwright-core；先在 repo 根目錄跑 python3 -m http.server 8765
// 用法：node tools/record-demo.mjs en|zh → frames-<lang>/，再用 ffmpeg 轉成 docs/demo-<lang>.mp4 / .gif（指令見檔尾）

import { chromium } from 'playwright-core';
import { mkdirSync, rmSync } from 'fs';
const LANG = process.argv[2] || 'en', OUT = `frames-${LANG}`, zh = LANG === 'zh', T = (a, b) => (zh ? a : b);
rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT);
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { localStorage.setItem('pool-settings', JSON.stringify({ tutDone: true, vol: 0 })); localStorage.setItem('pool-cfg', JSON.stringify({ opp: 'local', game: 9, race: 3, diff: 1 })); });
await ctx.clock.install();
let n = 0, pg;
const snap = async (k = 1) => { for (let i = 0; i < k; i++) { await ctx.clock.runFor(1000 / 30); await pg.screenshot({ path: `${OUT}/f${String(n++).padStart(4, '0')}.jpg`, quality: 92 }); } };
const ease = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const OVERLAY = `
#veil{position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:99999}
#cap{position:fixed;left:28px;top:72px;z-index:99998;font:600 19px/1.2 -apple-system,"PingFang TC",system-ui,sans-serif;color:#f2f2ee;background:rgba(12,14,14,.78);border:1px solid rgba(255,255,255,.14);padding:11px 18px;border-radius:999px;opacity:0;transition:none;letter-spacing:.01em}
#cap b{color:#6fdc9a;font-weight:700;margin-right:8px}`;
const overlay = p => p.evaluate(css => { const s = document.createElement('style'); s.textContent = css; document.head.append(s); for (const id of ['veil', 'cap']) { const d = document.createElement('div'); d.id = id; document.body.append(d); } }, OVERLAY);
const veil = (o, p = pg) => p.evaluate(o => (document.getElementById('veil').style.opacity = o), o);
const fadeOut = async () => { for (let i = 1; i <= 7; i++) { await veil(i / 7); await snap(); } };
const fadeIn = async () => { for (let i = 6; i >= 0; i--) { await veil(i / 7); await snap(); } };
const cap = (html, o = 1) => pg.evaluate(([h, o]) => { const c = document.getElementById('cap'); if (h != null) c.innerHTML = h; c.style.opacity = o; }, [html, o]);
const capIn = async h => { await cap(h, 0); for (let i = 1; i <= 6; i++) { await cap(null, i / 6); await snap(); } };
const capOut = async () => { for (let i = 5; i >= 0; i--) { await cap(null, i / 6); await snap(); } };
const P = (fn, arg) => pg.evaluate(fn, arg);

// ---------- desktop ----------
pg = await ctx.newPage();
pg.on('pageerror', e => console.log('ERR', e.message));
await pg.goto(`http://localhost:8765/?lang=${LANG}`);
await pg.waitForFunction(() => window.pool);
await overlay(pg);
await ctx.clock.runFor(500);
await snap(55);                                       // 首頁
await fadeOut();
await P(() => { document.getElementById('startBtn').click(); document.getElementById('cSkip')?.click(); pool.setDemo(true); pool.setPitch(0.26); });
await ctx.clock.runFor(300);
const y0 = await P(() => { const c = pool.balls[0], t = pool.balls[1]; return Math.atan2(t.z - c.z, t.x - c.x); });
await P(y => pool.setYaw(y + 0.14), y0);
await fadeIn();
await capIn(T('<b>9 號球</b>開球 · 真實物理', '<b>9-ball</b> break · real physics'));
for (let i = 1; i <= 26; i++) { await P(([y, k]) => pool.setYaw(y + 0.14 * (1 - k)), [y0, ease(i / 26)]); await snap(); }
await snap(6);
for (let i = 1; i <= 22; i++) { await P(v => pool.charge(v), i / 22); await snap(); }
await snap(3); await P(() => pool.fire()); await snap(36);
await capOut(); await P(() => pool.setTop(true)); await capIn(T('<b>俯視</b> · 一鍵看全局', '<b>Top view</b> · one key'));
for (let i = 0; i < 170 && (await P(() => pool.state)) !== 'aim'; i++) await snap();
await snap(12); await capOut();

const staged = async (top, tipY, label) => {
  const s = await P(() => {
    const c = pool.balls[0]; let best = null;
    for (let i = -14; i <= 14; i++) for (let j = -7; j <= 7; j++) {
      const x = i * 0.085, z = j * 0.085; if (pool.balls.some(b => b.active && b !== c && Math.hypot(b.x - x, b.z - z) < 0.12)) continue;
      const p = pool.planFrom(x, z); if (!p) continue;
      const t = pool.balls.filter(b => b.active && b.n).sort((a, b) => a.n - b.n)[0], d = Math.hypot(t.x - x, t.z - z);
      if (d < 0.35 || d > 0.9) continue;
      if (!best || p.score > best.p.score) best = { p, x, z };
    }
    if (!best) return null;
    c.x = best.x; c.z = best.z; c.vx = c.vz = 0; return { yaw: best.p.yaw, pow: Math.sqrt(Math.max(0, (best.p.speed - 0.1) / 7.9)) };
  });
  if (!s) return console.log('no plan');
  await fadeOut();
  await P(([y, top, ty]) => { pool.setYaw(y - 0.2); pool.setTop(top); pool.tip.y = ty; pool.tip.x = 0; }, [s.yaw, top, tipY]);
  await ctx.clock.runFor(200); await fadeIn(); await capIn(label);
  for (let i = 1; i <= 34; i++) { await P(([y, k]) => pool.setYaw(y - 0.2 * (1 - k)), [s.yaw, ease(i / 34)]); await snap(); }
  await snap(12);
  for (let i = 1; i <= 18; i++) { await P(v => pool.charge(v), (s.pow * i) / 18); await snap(); }
  await snap(3); const before = await P(() => pool.balls.filter(b => b.active).length);
  await P(() => pool.fire());
  for (let i = 0; i < 150 && (i < 10 || (await P(() => pool.state)) === 'moving'); i++) await snap();
  await snap(14); await capOut();
  console.log(label, 'potted', before - (await P(() => pool.balls.filter(b => b.active).length)));
};
await staged(false, -0.45, T('<b>瞄準線</b> · 影子球 · 走位預測', '<b>Aim line</b> · ghost ball · predicted paths'));
await staged(true, 0.4, T('<b>高低桿、加塞</b>都會影響母球', '<b>Follow, draw, side spin</b> all move the cue ball'));
await fadeOut();

// ---------- phone ----------
const wrap = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:radial-gradient(1200px 700px at 30% 40%,#1b2a22 0%,#0b0d0d 60%,#070808 100%);font-family:-apple-system,"PingFang TC",system-ui,sans-serif;color:#f2f2ee;overflow:hidden}
${OVERLAY}
.phone{position:absolute;left:40px;top:153px;padding:12px 16px;background:#050505;border-radius:46px;box-shadow:0 0 0 2px #2a2c2c,0 30px 80px rgba(0,0,0,.6)}
.phone iframe{display:block;width:844px;height:390px;border:0;border-radius:34px}
.txt{position:absolute;left:944px;right:36px;top:220px}
.txt h2{font-size:34px;margin:0 0 22px;line-height:1.15}
.txt p{font-size:18px;margin:0 0 12px;color:#c9ccc6;line-height:1.35}
.txt p::before{content:"";display:inline-block;width:7px;height:7px;border-radius:9px;background:#6fdc9a;margin:0 10px 3px 0}
#finger{position:fixed;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(255,255,255,.35);border:2px solid rgba(255,255,255,.85);box-shadow:0 0 18px rgba(255,255,255,.35);opacity:0;z-index:9999;pointer-events:none}
.end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.end h1{font-size:72px;margin:0 0 14px;letter-spacing:-.02em}.end .s{font-size:22px;color:#c9ccc6;margin:0 0 34px}
.end .u{font:600 24px ui-monospace,Menlo,monospace;color:#0b0d0d;background:#6fdc9a;padding:14px 26px;border-radius:999px}
</style></head><body>${body}</body></html>`;
await pg.setContent(wrap(`<div class="phone"><iframe src="http://localhost:8765/?touch&lang=${LANG}"></iframe></div>
<div class="txt"><h2>${T('手機也能玩', 'Plays on phones too')}</h2><p>${T('單指拖曳瞄準', 'Drag to aim')}</p><p>${T('往下拉力道條出桿', 'Pull the power bar to shoot')}</p><p>${T('Android 全螢幕・iOS 加入主畫面', 'Fullscreen on Android, Home Screen app on iOS')}</p></div><div id="finger"></div><div id="veil" style="opacity:1"></div>`));
let fr; for (let i = 0; i < 100 && !(fr = pg.mainFrame().childFrames()[0]); i++) await ctx.clock.runFor(50);
await fr.waitForFunction(() => window.pool && document.getElementById('startBtn'));
await ctx.clock.runFor(500);
await fr.evaluate(() => { document.getElementById('startBtn').click(); document.getElementById('cSkip')?.click(); document.getElementById('rotate')?.remove(); pool.setPitch(0.3); });
await ctx.clock.runFor(400);
const fy = await fr.evaluate(() => { const c = pool.balls[0], t = pool.balls[1]; return Math.atan2(t.z - c.z, t.x - c.x); });
await fr.evaluate(y => pool.setYaw(y - 0.16), fy);
const finger = (x, y, o) => pg.evaluate(([x, y, o]) => { const f = document.getElementById('finger'); f.style.left = x + 'px'; f.style.top = y + 'px'; f.style.opacity = o; }, [x, y, o]);
await fadeIn();
const ox = 56, oy = 165;                              // iframe 在頁面上的位置
await finger(ox + 330, oy + 220, 0.9);
for (let i = 1; i <= 30; i++) { const k = ease(i / 30); await fr.evaluate(([y, k]) => pool.setYaw(y - 0.16 * (1 - k)), [fy, k]); await finger(ox + 330 + 170 * k, oy + 220, 0.9); await snap(); }
await finger(0, 0, 0); await snap(8);
const r = await fr.evaluate(() => { const e = document.getElementById('tpowKnob') || document.getElementById('tpow'); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, h: document.querySelector('#tpow .tt').clientHeight }; });
const kx = ox + r.x, ky = oy + r.y;
await finger(kx, ky, 0.9); await snap(5);
await pg.mouse.move(kx, ky); await pg.mouse.down(); await snap(3);
for (let i = 1; i <= 22; i++) { const y = ky + r.h * 0.95 * ease(i / 22); await pg.mouse.move(kx, y); await finger(kx, y, 0.9); await snap(); }
await snap(4); await pg.mouse.up(); await finger(0, 0, 0);
await snap(75);
await fadeOut();

// ---------- end card ----------
await pg.setContent(wrap(`<div class="end"><h1>${T('3D 美式撞球', '3D Pool')}</h1><p class="s">${T('8 號球・9 號球・對電腦・傳連結線上對戰・手機可玩', '8-ball · 9-ball · vs computer · online with a link · phones')}</p><div class="u">yenchiachen.github.io/pool3d</div></div><div id="veil" style="opacity:1"></div>`));
await fadeIn(); await snap(60);
console.log('frames', n);
await b.close();

// ffmpeg -framerate 30 -i frames-en/f%04d.jpg -c:v libx264 -pix_fmt yuv420p -crf 20 -preset slow -movflags +faststart docs/demo-en.mp4
// ffmpeg -i docs/demo-en.mp4 -vf "fps=12,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" docs/demo-en.gif
