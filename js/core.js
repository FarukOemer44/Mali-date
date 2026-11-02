'use strict';
// core: screen, assets, input, dialogue, audio, save, main loop

const C = window.CONFIG;
const VERSION = 12;
const TS = 16;
let W = 400, H = 200, S = 2; // internal resolution + integer scale, set by layout()
const $ = (s) => document.querySelector(s);
const cv = $('#c');
const ctx = cv.getContext('2d');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => Math.floor(rnd(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const lerp = (a, b, t) => a + (b - a) * t;
const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;

// ---------- screen: fill the whole phone, crisp integer scaling ----------
function layout() {
  // use the area safari really shows (its toolbars eat into the top in landscape)
  const vv = window.visualViewport;
  const vw = Math.round(vv ? vv.width : window.innerWidth), vh = Math.round(vv ? vv.height : window.innerHeight);
  const root = document.documentElement.style;
  root.setProperty('--vvw', vw + 'px'); root.setProperty('--vvh', vh + 'px');
  root.setProperty('--vvt', (vv ? Math.round(vv.offsetTop) : 0) + 'px');
  if (window.scrollY) window.scrollTo(0, 0);
  const portrait = vh > vw;
  S = Math.max(1, Math.round(Math.min(vh / 200, vw / 330)));
  W = Math.ceil(vw / S); H = Math.ceil(vh / S);
  cv.width = W; cv.height = H;
  cv.style.width = W * S + 'px'; cv.style.height = H * S + 'px';
  ctx.imageSmoothingEnabled = false;
  document.documentElement.style.setProperty('--u', S + 'px');
  $('#rotate').classList.toggle('hidden', !(isTouch && portrait));
  if (scene && scene.resize) scene.resize();
}
addEventListener('resize', layout);
addEventListener('orientationchange', () => setTimeout(layout, 250));
if (window.visualViewport) { visualViewport.addEventListener('resize', layout); visualViewport.addEventListener('scroll', layout); }
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if (!e.target.closest('.card')) e.preventDefault(); }, { passive: false });

// ---------- save ----------
// ?test in the url = separate save slot, so testing never touches the real progress
const TEST_MODE = /[?&]test\b/.test(location.search);
const SAVE_KEY = TEST_MODE ? 'mali-date-quest-test' : 'mali-date-quest-v4';
const freshSave = () => ({
  done: {}, cats: {}, souvenirs: {}, beads: null, intro: false, submitted: null, allCats: false,
  log: [], playTime: 0, sessions: 0, startedAt: null,
});
let save = freshSave();
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (s && typeof s === 'object') save = Object.assign(freshSave(), s);
} catch (e) { /* private mode */ }
function persist() {
  // souvenirs are big data urls; if storage is full, drop them rather than losing progress
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
  catch (e) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(Object.assign({}, save, { souvenirs: {} }))); } catch (e2) {} }
}
function resetSave() { const s = save.sessions; save = freshSave(); save.sessions = s; persist(); }
// activity tracker: everything she does ends up in the email at the end
function track(e, data = {}) {
  if (!Array.isArray(save.log)) save.log = [];
  save.log.push(Object.assign({ t: Date.now(), e }, data));
  if (save.log.length > 400) save.log.splice(0, save.log.length - 400);
  persist();
}
setInterval(() => {
  if (document.visibilityState === 'visible' && save.intro) { save.playTime = (save.playTime || 0) + 5; if (save.playTime % 30 === 0) persist(); }
}, 5000);
const doneCount = () => C.dates.filter((d) => save.done[d.id]).length;
const catCount = () => C.cats.filter((c) => save.cats[c.name]).length;

// ---------- assets ----------
const ASSETS = {
  him: 'chars/him.png', her: 'chars/her.png', cats: 'chars/cats.png',
  p_him: 'portraits/him.png', p_her: 'portraits/her.png',
  icons: 'ui/icons.png', flea: 'items/flea.png', dateIcons: 'items/dates.png',
  logo: 'ui/logo.png', rotate: 'ui/rotate.png', tap: 'ui/tapmarker.png', stamp: 'ui/stamp.png', next: 'ui/next.png',
  terrain: 'world/terrain.png', treeRound: 'world/tree_round.png', treePine: 'world/tree_pine.png',
  bushes: 'world/bushes.png', props: 'world/props.png', lamp: 'world/lamp_post.png', bench: 'world/bench.png',
  signpost: 'world/signpost.png', fountain: 'world/fountain.png',
  b_cinema: 'buildings/cinema.png', b_ceramics: 'buildings/ceramics.png', b_mosaic: 'buildings/mosaic.png',
  b_beads: 'buildings/beads.png', b_cafe: 'buildings/cafe.png', b_ikea: 'buildings/ikea.png', b_flea: 'buildings/flea.png',
  b_busstop: 'buildings/busstop.png', b_bus: 'buildings/bus.png', b_house_a: 'buildings/house_a.png', b_house_b: 'buildings/house_b.png',
  s_ceramics: 'scenes/ceramics.png', s_mosaic: 'scenes/mosaic.png', s_beads: 'scenes/beads.png', s_cinema: 'scenes/cinema.png',
  s_flea: 'scenes/flea.png', s_ikea: 'scenes/ikea.png', s_cabin: 'scenes/cabin.png', s_title: 'scenes/title.png', s_final: 'scenes/final.png',
  m_mug_base: 'mini/mug_base.png', m_mug_mask: 'mini/mug_mask.png', m_mug_shade: 'mini/mug_shade.png',
  m_lamp_frame: 'mini/lamp_frame.png', m_lamp_cells: 'mini/lamp_cells.png', m_kiln: 'mini/kiln.png',
  m_popcorn: 'mini/popcorn.png', m_bucket: 'mini/bucket.png', m_beads: 'mini/beads.png', m_bowl: 'mini/bowl.png',
  m_maze: 'mini/maze.png', m_firefly: 'mini/firefly.png', m_jar: 'mini/jar.png', m_campfire: 'mini/campfire.png', m_table: 'mini/table.png',
  her_hat: 'chars/her_hat.png',
  f_street: 'fight/street.png', f_arena: 'fight/arena.png', f_mali: 'fight/mali_finn.png', f_buddy: 'fight/buddy.png',
  f_arm: 'fight/buddy_arm.png', f_fist: 'fight/buddy_fist.png', f_golem: 'fight/golem.png', f_junk: 'fight/junk.png',
  f_pickups: 'fight/pickups.png', f_poof: 'fight/poof.png', f_fx: 'fight/fx.png', f_shock: 'fight/shock.png',
  f_ui: 'fight/fight_ui.png', f_banners: 'fight/banners.png', f_buttons: 'fight/buttons.png',
  f_ride: 'fight/ride.png', f_ride_big: 'fight/ride_big.png',
};
const IMG = {};
function loadAssets(onProgress) {
  const keys = Object.keys(ASSETS);
  let n = 0;
  return Promise.all(keys.map((k) => new Promise((res) => {
    const i = new Image();
    i.onload = i.onerror = () => { n++; if (onProgress) onProgress(n / keys.length); res(); };
    i.src = 'assets/' + ASSETS[k] + '?v=' + VERSION;
    IMG[k] = i;
  })));
}
const ok = (k) => !!(IMG[k] && IMG[k].complete && IMG[k].naturalWidth > 0);
function placeholder(g, x, y, w, h, col = 'rgba(232,120,192,.45)') { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); }
// draw frame (col,row) of a sprite sheet with frame size fw x fh at x,y (top-left)
function frame(g, key, fw, fh, col, row, x, y, flip = false) {
  x = Math.round(x); y = Math.round(y);
  if (!ok(key)) { placeholder(g, x, y, fw, fh); return; }
  const img = IMG[key];
  if (flip) { g.save(); g.translate(x + fw, y); g.scale(-1, 1); g.drawImage(img, col * fw, row * fh, fw, fh, 0, 0, fw, fh); g.restore(); }
  else g.drawImage(img, col * fw, row * fh, fw, fh, x, y, fw, fh);
}
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; }
// paint an icon (16x16) or any sheet frame into a small <canvas> element
function paintIcon(canvas, key, idx, size = 16) {
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, canvas.width, canvas.height);
  if (ok(key)) g.drawImage(IMG[key], idx * size, 0, size, size, 0, 0, canvas.width, canvas.height);
}
function iconEl(idx, cls = '') {
  const c = document.createElement('canvas'); c.width = 16; c.height = 16; c.className = cls;
  paintIcon(c, 'icons', idx);
  return c;
}
const ICON = { heart: 0, heartEmpty: 1, sparkle: 2, check: 3, cat: 4, star: 5, soundOn: 6, soundOff: 7, close: 8, left: 9, right: 10, pin: 11, calendar: 12, pencil: 13, camera: 14, markerNew: 15, markerDone: 16, paw: 17 };

// ---------- drawing helpers ----------
function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function disc(g, cx, cy, r, c) {
  g.fillStyle = c;
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy) + 0.5);
    g.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2, 1);
  }
}
function ellipseShadow(g, x, y, rx, ry, a = 0.28) {
  g.fillStyle = `rgba(27,20,36,${a})`;
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.round(rx * Math.sqrt(1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5))));
    g.fillRect(Math.round(x - w), Math.round(y + dy), w * 2, 1);
  }
}
function glow(g, x, y, r, col, a = 0.35) { // soft round glow (used for lights)
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.save(); g.globalAlpha = a; g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
}
function spriteFrom(rows, pal) {
  const [c, g] = makeCanvas(rows[0].length, rows.length);
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
  return c;
}
const HEART_SPR = spriteFrom(['.kk.kk.', 'kppkppk', 'kpwpppk', 'kpppppk', '.kpppk.', '..kpk..', '...k...'], { k: '#6e1a2e', p: '#d84a52', w: '#f8aeb0' });
const SPARK_SPR = spriteFrom(['..w..', '..y..', 'wyWyw', '..y..', '..w..'], { w: '#fff6b8', y: '#f0c040', W: '#fbfaff' });

// characters: who = 'him' | 'her'; x,y = feet position
const DIRS = { down: 0, left: 1, right: 2, up: 3 };
const POSE = { sit: 0, sitBlink: 1, wave: 2, selfie: 4, happy: 5 };
function drawChar(g, who, x, y, dir, moving, t, pose = null) {
  if (who === 'her' && save.hat && ok('her_hat')) who = 'her_hat'; // she keeps the bear hat after the flea market
  if (pose !== 'sit') ellipseShadow(g, x, y, 7, 2, 0.3);
  let col, row;
  if (pose) {
    row = 4;
    if (pose === 'wave') col = 2 + (Math.floor(t * 4) % 2);
    else if (pose === 'sit') col = (t % 3.2) > 3.0 ? 1 : 0;
    else col = POSE[pose] ?? 0;
  } else {
    row = DIRS[dir] ?? 0;
    col = moving ? 2 + (Math.floor(t * 8) % 4) : (Math.floor(t * 1.6) % 2);
  }
  if (!ok(who)) { // placeholder figure until the art exists
    const h = who === 'him' ? 36 : 30;
    R(g, x - 5, y - h, 10, h, who === 'him' ? '#c2aa84' : '#66402c');
    R(g, x - 4, y - h, 8, 8, who === 'him' ? '#c58560' : '#dca581');
    return;
  }
  frame(g, who, 24, 40, col, row, x - 12, y - 38);
}
// cats: 16x16, feet (8,15). mode: sit | walk | happy | sleep. walk frames face right
function drawCat(g, idx, x, y, mode, t, flip = false) {
  ellipseShadow(g, x, y, 5, 1, 0.25);
  let col = 0;
  if (mode === 'walk') col = 2 + (Math.floor(t * 8) % 4);
  else if (mode === 'happy') col = 6;
  else if (mode === 'sleep') col = 7;
  else col = (t % 4) > 3.6 ? 1 : 0;
  if (!ok('cats')) { R(g, x - 5, y - 9, 10, 9, ['#fbfaff', '#2a2430', '#f0944a', '#e2cfa6', '#b4b0c4'][idx % 5]); return; }
  frame(g, 'cats', 16, 16, col, idx, x - 8, y - 15, flip);
}
function drawIcon(g, idx, x, y) { frame(g, 'icons', 16, 16, idx, 0, x, y); }

// ---------- input ----------
const keys = { up: 0, down: 0, left: 0, right: 0, a: 0, b: 0 };
const pressed = {};
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right', Space: 'a', Enter: 'a', KeyE: 'a', KeyZ: 'a', Escape: 'b', KeyX: 'b',
};
const uiStack = [];
const uiTop = () => uiStack[uiStack.length - 1];
function press(k) {
  audioUnlock();
  pressed[k] = true;
  const top = uiTop();
  if (top) {
    if (k === 'a' && top.onA) { top.onA(); pressed.a = false; }
    else if (k === 'b' && top.onB) { top.onB(); pressed.b = false; }
    else if (top.onDir && ['up', 'down', 'left', 'right'].includes(k)) top.onDir(k);
  }
}
const hit = (k) => { if (pressed[k]) { pressed[k] = false; return true; } return false; };
const held = (k) => !!keys[k];
addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input,textarea')) return;
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  if (!keys[k]) press(k);
  keys[k] = 1;
});
addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) keys[k] = 0; });
addEventListener('blur', () => { for (const k in keys) keys[k] = 0; });

// pointer on the canvas, in game pixels. scenes can implement pointer(type, x, y)
const ptr = { x: 0, y: 0, down: false, tap: false, up: false, sx: 0, sy: 0, moved: false };
function toGame(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / S, y: (e.clientY - r.top) / S }; }
cv.addEventListener('pointerdown', (e) => {
  audioUnlock();
  const p = toGame(e);
  Object.assign(ptr, { x: p.x, y: p.y, sx: p.x, sy: p.y, down: true, tap: true, moved: false });
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  if (scene && scene.pointer && !uiStack.length) scene.pointer('down', p.x, p.y);
});
cv.addEventListener('pointermove', (e) => {
  const p = toGame(e);
  ptr.x = p.x; ptr.y = p.y;
  if (ptr.down && Math.hypot(p.x - ptr.sx, p.y - ptr.sy) > 5) ptr.moved = true;
  if (ptr.down && scene && scene.pointer && !uiStack.length) scene.pointer('move', p.x, p.y);
});
const ptrUp = () => {
  if (!ptr.down) return;
  ptr.down = false; ptr.up = true;
  if (scene && scene.pointer) scene.pointer('up', ptr.x, ptr.y);
};
cv.addEventListener('pointerup', ptrUp);
cv.addEventListener('pointercancel', ptrUp);

// ---------- audio: tiny chiptune synth ----------
let AC = null, master = null, musicGain = null, muted = false;
try { muted = localStorage.getItem('mdq-muted') === '1'; } catch (e) {}
function audioUnlock() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  const A = window.AudioContext || window.webkitAudioContext;
  if (!A) return;
  AC = new A();
  master = AC.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(AC.destination);
  musicGain = AC.createGain(); musicGain.gain.value = 0.3; musicGain.connect(master);
  const b = AC.createBuffer(1, 1, 22050), s = AC.createBufferSource(); s.buffer = b; s.connect(AC.destination); s.start(0);
}
function tone(freq, dur, type = 'square', vol = 0.15, when = 0, dest = null, slide = 0) {
  if (!AC || !freq) return;
  const t = AC.currentTime + when;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.03);
}
const SFX = {
  blip: (who) => tone(who === 'me' ? 300 : who === 'mali' ? 540 : 420, 0.035, 'square', 0.035),
  select: () => { tone(660, 0.06, 'square', 0.08); tone(990, 0.08, 'square', 0.07, 0.05); },
  back: () => tone(300, 0.08, 'square', 0.07),
  door: () => { tone(220, 0.1, 'triangle', 0.18); tone(330, 0.14, 'triangle', 0.18, 0.08); },
  coin: () => { tone(988, 0.06, 'square', 0.08); tone(1319, 0.12, 'square', 0.08, 0.06); },
  bad: () => tone(170, 0.22, 'sawtooth', 0.08, 0, null, 0.5),
  pop: () => tone(620, 0.05, 'triangle', 0.14, 0, null, 1.8),
  paint: () => tone(rnd(500, 700), 0.03, 'triangle', 0.04),
  meow: () => { tone(760, 0.28, 'triangle', 0.11, 0, null, 0.6); tone(950, 0.16, 'sine', 0.05, 0.02, null, 0.7); },
  purr: () => { for (let i = 0; i < 6; i++) tone(55 + (i % 2) * 6, 0.09, 'sawtooth', 0.03, i * 0.09); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'square', 0.08, i * 0.1)),
  heart: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, i * 0.08)),
  step: () => tone(110, 0.025, 'triangle', 0.035),
  tap: () => tone(880, 0.03, 'sine', 0.05),
};
function setMuted(m) {
  muted = m;
  try { localStorage.setItem('mdq-muted', m ? '1' : '0'); } catch (e) {}
  if (master) master.gain.value = m ? 0 : 0.5;
  paintIcon($('#mute canvas'), 'icons', m ? ICON.soundOff : ICON.soundOn);
}
$('#mute').addEventListener('click', (e) => { e.stopPropagation(); audioUnlock(); setMuted(!muted); });

const N = (n) => (n == null ? 0 : 440 * Math.pow(2, (n - 69) / 12));
const SONGS = {
  town: {
    bpm: 100,
    lead: [76, null, 79, 81, 79, null, 76, 74, 72, null, 74, 76, 74, null, null, null,
      76, null, 79, 81, 84, null, 83, 81, 79, null, 76, 74, 76, null, null, null,
      72, null, 74, 76, 79, null, 76, 74, 72, null, 69, 72, 74, null, 76, null,
      77, null, 76, 74, 72, null, 74, 76, 72, null, null, null, null, null, null, null],
    bass: [48, 55, 52, 55, 45, 52, 48, 52, 41, 48, 45, 48, 43, 50, 47, 50],
  },
  night: {
    bpm: 72,
    lead: [69, null, 72, null, 76, null, 74, 72, 71, null, null, null, 67, null, 71, null,
      69, null, 72, null, 76, null, 79, 77, 76, null, null, null, null, null, null, null],
    bass: [45, 52, 48, 52, 43, 50, 47, 50],
  },
  game: {
    bpm: 132,
    lead: [72, 76, 79, 76, 72, 76, 79, 84, 81, 77, 74, 77, 81, null, 79, null,
      72, 76, 79, 76, 72, 76, 79, 84, 83, 79, 76, 74, 72, null, null, null],
    bass: [48, 48, 53, 53, 50, 50, 55, 55],
  },
};
const music = { name: null, step: 0, next: 0, timer: null };
function playMusic(name) {
  if (music.name === name) return;
  music.name = name; music.step = 0;
  if (music.timer) clearInterval(music.timer);
  if (!name) return;
  music.next = 0;
  music.timer = setInterval(() => {
    if (!AC || AC.state !== 'running') return;
    const song = SONGS[music.name];
    const stepDur = 60 / song.bpm / 2;
    if (music.next < AC.currentTime) music.next = AC.currentTime + 0.05;
    while (music.next < AC.currentTime + 0.25) {
      const i = music.step, when = music.next - AC.currentTime;
      const ln = song.lead[i % song.lead.length];
      if (ln) tone(N(ln), stepDur * 1.6, 'square', 0.045, when, musicGain);
      if (i % 2 === 0) tone(N(song.bass[(i / 2) % song.bass.length]), stepDur * 1.8, 'triangle', 0.15, when, musicGain);
      if (i % 4 === 2) tone(N(96), 0.02, 'square', 0.012, when, musicGain);
      music.step++; music.next += stepDur;
    }
  }, 60);
}

// ---------- particles ----------
let particles = [];
function burst(x, y, kind = 'heart', n = 6) {
  for (let i = 0; i < n; i++) particles.push({ x, y, vx: rnd(-28, 28), vy: rnd(-60, -22), life: rnd(0.7, 1.2), t: 0, kind });
}
function updateParticles(dt) {
  for (const p of particles) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 45 * dt; }
  particles = particles.filter((p) => p.t < p.life);
}
function drawParticles(g, ox = 0, oy = 0) {
  for (const p of particles) {
    const spr = p.kind === 'heart' ? HEART_SPR : SPARK_SPR;
    if (p.t > p.life * 0.7 && Math.floor(p.t * 20) % 2) continue; // blink out
    g.drawImage(spr, Math.round(p.x - ox - spr.width / 2), Math.round(p.y - oy - spr.height / 2));
  }
}

// ---------- fade ----------
const fade = { a: 1, target: 0, speed: 3, res: null };
function fadeTo(target, speed = 3) { return new Promise((res) => { fade.target = target; fade.speed = speed; fade.res = res; }); }
const fadeOut = (s) => fadeTo(1, s);
const fadeIn = (s) => fadeTo(0, s);
function updateFade(dt) {
  if (fade.a !== fade.target) {
    const d = fade.speed * dt;
    fade.a = fade.a < fade.target ? Math.min(fade.target, fade.a + d) : Math.max(fade.target, fade.a - d);
  }
  if (fade.a === fade.target && fade.res) { const r = fade.res; fade.res = null; r(); }
  if (fade.a > 0) {
    const a = Math.round(fade.a * 6) / 6;
    ctx.fillStyle = `rgba(27,20,36,${a})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ---------- dialogue ----------
const dlg = $('#dlg'), dlgText = $('#dlg-text'), dlgName = $('#dlg-name'), dlgFace = $('#dlg-face'), dlgChoices = $('#dlg-choices');
const EXPR = { neutral: 0, happy: 1, love: 2, tease: 3 };
dlg.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.pbtn')) return;
  audioUnlock();
  const top = uiTop();
  if (top && top.onA && top.tapAdvance !== false) top.onA();
});
function parseWho(who) {
  const [w, ex] = String(who || '').split(':');
  return { w: w || null, ex: EXPR[ex] ?? 0 };
}
function setSpeaker(whoRaw, name) {
  const { w, ex } = parseWho(whoRaw);
  dlg.classList.remove('hidden');
  const sheet = w === 'me' ? 'p_him' : w === 'mali' ? 'p_her' : null;
  dlg.classList.toggle('noface', !sheet);
  if (sheet) {
    const g = dlgFace.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, 64, 64);
    if (ok(sheet)) g.drawImage(IMG[sheet], ex * 64, 0, 64, 64, 0, 0, 64, 64);
    else { g.fillStyle = w === 'me' ? '#c58560' : '#dca581'; g.fillRect(12, 8, 40, 48); }
  }
  dlgName.textContent = name != null ? name : w === 'me' ? C.hisName : w === 'mali' ? C.herName : '';
  paintIcon($('#dlg-next'), 'next', 0, 8);
  return w;
}
function typeText(text, who, onDone) {
  let i = 0;
  dlgText.textContent = '';
  dlg.classList.remove('more');
  const tm = setInterval(() => {
    i++;
    dlgText.textContent = text.slice(0, i);
    if (i % 3 === 1 && text[i - 1] !== ' ') SFX.blip(who);
    if (i >= text.length) { clearInterval(tm); onDone(); }
  }, 22);
  return () => { clearInterval(tm); dlgText.textContent = text; onDone(); };
}
function say(whoRaw, text, name) {
  return new Promise((res) => {
    const who = setSpeaker(whoRaw, name);
    let done = false;
    const finish = typeText(text, who, () => { done = true; dlg.classList.add('more'); });
    uiStack.push({
      onA() {
        if (!done) { finish(); return; }
        uiStack.pop(); dlg.classList.remove('more'); SFX.blip('x'); res();
      },
    });
  });
}
function hideDlg() { dlg.classList.add('hidden'); dlgChoices.innerHTML = ''; }
// opts.runaway = index of a button that runs away from the finger
function ask(whoRaw, text, options, opts = {}) {
  return new Promise((res) => {
    const who = setSpeaker(whoRaw, opts.name);
    dlgChoices.innerHTML = '';
    let sel = 0, ready = false;
    const btns = [];
    const finish = typeText(text, who, () => {
      if (ready) return;
      ready = true;
      options.forEach((label, i) => {
        const b = document.createElement('button');
        b.className = 'pbtn' + (i === 0 ? ' green' : '');
        b.textContent = label;
        b.addEventListener('click', (e) => { e.stopPropagation(); choose(i); });
        if (opts.runaway === i) setupRunaway(b, () => choose(i));
        dlgChoices.appendChild(b);
        btns.push(b);
      });
      paint();
    });
    function paint() { btns.forEach((b, i) => b.classList.toggle('sel', i === sel && !isTouch)); }
    let chosen = false;
    function choose(i) {
      if (chosen) return; // the runaway button has two click handlers; only the first one counts
      if (opts.runaway === i && btns[i].dataset.gaveUp !== '1') return;
      chosen = true;
      const dodges = opts.runaway != null ? +(btns[opts.runaway].dataset.dodges || 0) : 0;
      if (opts.track !== false) track('answer', { q: text, a: options[i] + (opts.runaway === i ? ' (after the button gave up)' : ''), dodges, ctx: window.curDate || null });
      ask.lastDodges = dodges;
      uiStack.pop(); SFX.select(); btns.forEach((b) => b.remove()); dlgChoices.innerHTML = ''; res(i);
    }
    uiStack.push({
      tapAdvance: false,
      onA() { if (!ready) { finish(); return; } choose(sel); },
      onDir(k) {
        if (!ready) return;
        if (k === 'up' || k === 'left') sel = (sel + btns.length - 1) % btns.length;
        if (k === 'down' || k === 'right') sel = (sel + 1) % btns.length;
        if (opts.runaway === sel && btns[sel].dataset.gaveUp !== '1') { btns[sel]._dodge(); sel = (sel + 1) % btns.length; }
        SFX.blip('x'); paint();
      },
    });
    dlg.querySelector('.dlg-box').onpointerdown = () => { if (!ready) finish(); };
  });
}
function setupRunaway(b, giveUp) {
  let dodges = 0;
  b._dodge = () => {
    dodges++;
    b.dataset.dodges = dodges;
    SFX.pop();
    if (dodges >= 7) {
      b.dataset.gaveUp = '1';
      b.textContent = 'ok fine... yes ♥';
      b.classList.add('green');
      return;
    }
    const st = $('#stage').getBoundingClientRect();
    if (!b.classList.contains('runaway')) {
      const r = b.getBoundingClientRect();
      b.classList.add('runaway');
      $('#stage').appendChild(b);
      b.style.left = r.left - st.left + 'px'; b.style.top = r.top - st.top + 'px';
    }
    const bw = b.offsetWidth, bh = b.offsetHeight;
    b.style.left = rnd(st.width * 0.08, st.width * 0.92 - bw) + 'px';
    b.style.top = rnd(st.height * 0.08, st.height * 0.5 - bh) + 'px';
    const lines = ['nope', 'nice try', 'hehe', 'too slow', 'not today', 'almost', 'u sure?'];
    b.textContent = lines[(dodges - 1) % lines.length];
  };
  b.addEventListener('pointerdown', (e) => { if (b.dataset.gaveUp !== '1') { e.preventDefault(); e.stopPropagation(); b._dodge(); } });
  b.addEventListener('click', (e) => { e.stopPropagation(); if (b.dataset.gaveUp === '1') { b.remove(); giveUp(); } });
}
// lines: ['me', 'text'] / ['me:happy', 'text'] / ['ask', 'text', [options]]
async function talk(lines) {
  for (const l of lines) {
    if (l[0] === 'ask') await ask('me', l[1], l[2]);
    else await say(l[0], l[1], l[2]);
  }
  hideDlg();
}

// ---------- panel + toast ----------
const panel = $('#panel');
function showPanel(html, cls = '') {
  panel.innerHTML = `<div class="card ${cls}">${html}</div>`;
  panel.classList.remove('hidden');
  panel.querySelectorAll('canvas[data-icon]').forEach((c) => paintIcon(c, 'icons', +c.dataset.icon));
  return panel.firstChild;
}
function hidePanel() { panel.classList.add('hidden'); panel.innerHTML = ''; }
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hidden'), 2500);
}
function updateHud() {
  const n = doneCount(), c = catCount();
  $('#hud-hearts').textContent = n + '/' + C.dates.length;
  $('#hud-cats').textContent = c + '/' + C.cats.length;
  $('#hud-hearts').parentElement.classList.toggle('full', n >= C.dates.length);
  $('#hud-cats').parentElement.classList.toggle('full', c >= C.cats.length);
  updateQuest();
}
// the current objective, always visible top right
let lastQuestStage = null;
function updateQuest() {
  const n = doneCount(), total = C.dates.length;
  let stage, title, count = '', sub, pct;
  if (save.submitted) { stage = 'end'; title = 'it\'s a date ♥'; sub = 'you picked: ' + save.submitted.title + '. that\'s the end, you can keep exploring'; pct = 100; }
  else if (n >= total) { stage = 'fountain'; title = 'meet me at the fountain'; sub = 'last step: pick the date we actually do + the day'; pct = 90; }
  else { stage = 'dates'; title = 'try all ' + total + ' date spots'; count = n + '/' + total; sub = 'then pick the real one at the fountain ♥ (the yellow ! shows where)'; pct = Math.round((n / total) * 80); }
  $('#q-title').textContent = title;
  $('#q-count').textContent = count;
  $('#q-sub').textContent = sub;
  $('#q-bar i').style.width = pct + '%';
  const items = C.dates.map((d) => `<li class="${save.done[d.id] ? 'done' : ''}"><i></i>${d.title}</li>`);
  items.push(`<li class="final ${n >= total ? '' : 'locked'} ${save.submitted ? 'done' : ''}"><i></i>fountain: pick our date ♥</li>`);
  $('#q-list').innerHTML = items.join('');
  const q = $('#quest');
  if (lastQuestStage && stage !== lastQuestStage) { q.classList.remove('pulse'); void q.offsetWidth; q.classList.add('pulse'); }
  lastQuestStage = stage;
}
$('#quest').addEventListener('click', (e) => { e.stopPropagation(); audioUnlock(); SFX.blip('x'); $('#quest').classList.toggle('open'); });
function showHud(on) {
  $('#hud').classList.toggle('hidden', !on);
  $('#quest').classList.toggle('hidden', !on);
  if (!on) $('#quest').classList.remove('open');
  if (on) updateHud();
}

// ---------- main loop ----------
let scene = null, T = 0, lastTs = 0;
function setScene(s) { scene = s; if (s && s.enter) s.enter(); }
function loop(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
  lastTs = ts; T += dt;
  ctx.imageSmoothingEnabled = false;
  if (scene) {
    if (scene.update) scene.update(dt);
    if (scene.draw) scene.draw();
  }
  updateFade(dt);
  for (const k in pressed) pressed[k] = false;
  ptr.tap = false; ptr.up = false;
  requestAnimationFrame(loop);
}
