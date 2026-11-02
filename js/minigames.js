'use strict';
// mini games. each one: intro card -> play (canvas + touch) -> result card. resolves with a result object

const miniHud = Object.assign(document.createElement('div'), { id: 'minihud', className: 'hidden' });
const miniTools = Object.assign(document.createElement('div'), { id: 'minitools', className: 'hidden' });
document.body.append(miniHud, miniTools);
function setHud(html) { miniHud.innerHTML = html; miniHud.classList.remove('hidden'); }
function clearMiniUi() { miniHud.classList.add('hidden'); miniTools.classList.add('hidden'); miniHud.innerHTML = ''; miniTools.innerHTML = ''; }
const fmtTime = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

// background: a date scene centred and dimmed
function sceneOffset(ih = 270, iw = 480) {
  return { ox: Math.round((iw - W) / 2), oy: Math.round((ih - H) / 2) };
}
function drawDimScene(key, dim = 0.45) {
  const g = ctx;
  g.fillStyle = '#1b1424'; g.fillRect(0, 0, W, H);
  const { ox, oy } = sceneOffset();
  if (ok(key)) g.drawImage(IMG[key], -ox, -oy);
  if (dim) { g.fillStyle = `rgba(27,20,36,${dim})`; g.fillRect(0, 0, W, H); }
}

function cardPanel({ title, lines = [], button = 'let\'s go', art = null, stamp = false }) {
  return new Promise((res) => {
    const card = showPanel(`
      <div class="cols">
        ${art ? '<div class="col-art" id="mini-art"></div>' : ''}
        <div>
          ${stamp ? '<canvas class="stamp px" id="mini-stamp" width="96" height="32"></canvas>' : ''}
          <h2>${title}</h2>
          ${lines.map((l) => `<p>${l}</p>`).join('')}
          <button class="pbtn green" id="mini-go">${button}</button>
        </div>
      </div>`);
    if (art) card.querySelector('#mini-art').appendChild(art);
    if (stamp) { const s = card.querySelector('#mini-stamp'); const g = s.getContext('2d'); if (ok('stamp')) g.drawImage(IMG.stamp, 0, 0); }
    const go = () => { uiStack.pop(); hidePanel(); SFX.select(); res(); };
    card.querySelector('#mini-go').addEventListener('click', go);
    uiStack.push({ onA: go, tapAdvance: false });
  });
}
function artCanvas(src, cssW) { // wrap a canvas for a card, scaled crisply
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height; c.className = 'thumb';
  c.getContext('2d').drawImage(src, 0, 0);
  c.style.width = `calc(var(--u) * ${cssW || src.width})`; c.style.height = `calc(var(--u) * ${(cssW || src.width) * src.height / src.width})`;
  return c;
}

async function runMini(def) {
  const sc = def.scene;
  sc.phase = 'intro';
  setScene(sc);
  await fadeIn(5);
  await cardPanel({ title: def.title, lines: def.help, button: 'let\'s go' });
  sc.phase = 'play';
  playMusic('game');
  if (sc.start) sc.start();
  const result = await new Promise((res) => { sc.finish = res; });
  clearMiniUi();
  const end = def.end(result);
  await cardPanel({ title: end.title, lines: end.lines, button: 'nice →', art: end.art });
  return result;
}

function toolButton(label, onClick, cls = '') {
  const b = document.createElement('button');
  b.className = 'pbtn ' + cls; b.innerHTML = label;
  b.addEventListener('click', (e) => { e.stopPropagation(); onClick(b); });
  return b;
}
function swatches(colors, onPick, start = 0) {
  const wrap = document.createElement('div'); wrap.className = 'swatches';
  colors.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'sw' + (i === start ? ' on' : ''); b.style.background = c;
    b.addEventListener('click', (e) => { e.stopPropagation(); wrap.querySelectorAll('.sw').forEach((x) => x.classList.remove('on')); b.classList.add('on'); SFX.blip('x'); onPick(i); });
    wrap.appendChild(b);
  });
  return wrap;
}

// =============== ceramics: paint the mug ===============
function mugGame() {
  const MW_ = 128, MH_ = 112;
  const colors = ['#4a8f46', '#9fd065', '#2f5aa0', '#7cb8ec', '#d84a52', '#f8aeb0', '#f0c040', '#8a62bf', '#1b1424', '#fff7e6'];
  const [paint, pg] = makeCanvas(MW_, MH_);
  const [tmp, tg] = makeCanvas(MW_, MH_);
  let color = 0, size = 1, undo = [], last = null, firing = -1, result = null;
  const SIZES = [1, 3, 6];
  const pos = () => ({ x: Math.round(W / 2 - MW_ / 2 - 40), y: Math.round(H / 2 - MH_ / 2 + 2) });
  function snap() { undo.push(pg.getImageData(0, 0, MW_, MH_)); if (undo.length > 20) undo.shift(); }
  function dab(x, y) { disc(pg, Math.round(x), Math.round(y), SIZES[size], colors[color]); }
  function stroke(a, b) {
    const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d));
    for (let i = 0; i <= n; i++) dab(lerp(a.x, b.x, i / n), lerp(a.y, b.y, i / n));
  }
  function composite(g, x, y) {
    if (ok('m_mug_base')) g.drawImage(IMG.m_mug_base, x, y); else placeholder(g, x, y, MW_, MH_, '#f5e7c8');
    tg.clearRect(0, 0, MW_, MH_);
    tg.globalCompositeOperation = 'source-over'; tg.drawImage(paint, 0, 0);
    if (ok('m_mug_mask')) { tg.globalCompositeOperation = 'destination-in'; tg.drawImage(IMG.m_mug_mask, 0, 0); tg.globalCompositeOperation = 'source-over'; }
    g.drawImage(tmp, x, y);
    if (ok('m_mug_shade')) g.drawImage(IMG.m_mug_shade, x, y);
  }
  const scene = {
    t: 0,
    start() {
      miniTools.innerHTML = '';
      miniTools.append(
        swatches(colors, (i) => { color = i; }),
        (() => { const row = document.createElement('div'); row.className = 'tool-row';
          ['S', 'M', 'L'].forEach((l, i) => row.appendChild(toolButton(l, (b) => { size = i; row.querySelectorAll('.pbtn').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); }, i === 1 ? 'sm sel' : 'sm')));
          return row; })(),
        (() => { const row = document.createElement('div'); row.className = 'tool-row';
          row.append(
            toolButton('fill', () => { snap(); pg.fillStyle = colors[color]; pg.fillRect(0, 0, MW_, MH_); SFX.pop(); }, 'sm'),
            toolButton('undo', () => { const s = undo.pop(); if (s) pg.putImageData(s, 0, 0); SFX.back(); }, 'sm'),
          );
          return row; })(),
        toolButton('done ✓', () => this.done(), 'green'),
      );
      miniTools.classList.remove('hidden');
      setHud('paint your mug ♥');
    },
    done() {
      if (firing >= 0) return;
      firing = 0; clearMiniUi(); SFX.door();
    },
    pointer(type, x, y) {
      if (this.phase !== 'play' || firing >= 0) return;
      const p = pos(), lx = x - p.x, ly = y - p.y;
      if (type === 'down') { snap(); last = { x: lx, y: ly }; dab(lx, ly); SFX.paint(); }
      else if (type === 'move' && last) { stroke(last, { x: lx, y: ly }); last = { x: lx, y: ly }; if (Math.random() < 0.15) SFX.paint(); }
      else if (type === 'up') last = null;
    },
    update(dt) {
      this.t += dt; updateParticles(dt);
      if (firing >= 0) {
        firing += dt;
        if (firing > 2.2 && !result) {
          const [c, g] = makeCanvas(MW_, MH_);
          composite(g, 0, 0);
          result = { img: c.toDataURL(), canvas: c };
          for (let i = 0; i < 14; i++) burst(W / 2 + rnd(-50, 50), H / 2 + rnd(-40, 30), i % 2 ? 'heart' : 'spark', 1);
          SFX.win();
        }
        if (firing > 3.6) { firing = -2; this.finish(result); }
      }
    },
    draw() {
      drawDimScene('s_ceramics', 0.5);
      const g = ctx, p = pos();
      if (firing >= 0 && firing < 2.2) {
        const kx = Math.round(W / 2 - 48), ky = Math.round(H / 2 - 52);
        frame(g, 'm_kiln', 96, 96, firing > 0.5 ? 1 : 0, 0, kx, ky);
        if (firing > 0.5) glow(g, kx + 48, ky + 49, 56, '#f0944a', 0.3 + Math.sin(firing * 10) * 0.08);
        return;
      }
      const cx = firing >= 2.2 ? Math.round(W / 2 - MW_ / 2) : p.x;
      if (firing >= 2.2) glow(g, W / 2, H / 2, 90, '#fff6b8', 0.25);
      ellipseShadow(g, cx + MW_ / 2 - 6, p.y + MH_ - 3, 44, 5, 0.3);
      composite(g, cx, p.y);
      drawParticles(g);
    },
  };
  return {
    title: 'paint your mug',
    help: ['pick colours on the right and paint with your finger.', 'fill = paint the whole thing, undo if you mess up.', 'hit done and it goes in the kiln.'],
    scene,
    end: (r) => ({ title: 'fresh out of the kiln', lines: ['it\'s perfect honestly. frame it.', 'in real life we pick it up a few days later'], art: artCanvas(r.canvas, 96) }),
  };
}

// =============== mosaic lamp ===============
function lampGame() {
  const LW = 128, LH = 128;
  const colors = ['#d84a52', '#f0944a', '#f0c040', '#6fb14e', '#52b8a2', '#4a86cf', '#5e3e94', '#e878c0', '#fff6b8', '#2f8a7f'];
  let cellIds = null, cells = {}, ids = [], filled = {}, color = 0, lit = -1, result = null;
  const [layer, lg] = makeCanvas(LW, LH);
  let layerData = null;
  function init() {
    if (!ok('m_lamp_cells')) return;
    const [c, g] = makeCanvas(LW, LH);
    g.drawImage(IMG.m_lamp_cells, 0, 0);
    const d = g.getImageData(0, 0, LW, LH).data;
    cellIds = new Uint8Array(LW * LH);
    for (let i = 0; i < LW * LH; i++) {
      if (d[i * 4 + 3] > 128 && d[i * 4] > 0) {
        const id = d[i * 4]; cellIds[i] = id;
        (cells[id] = cells[id] || { px: [], sx: 0, sy: 0 }).px.push(i);
      }
    }
    ids = Object.keys(cells).map(Number);
    for (const id of ids) { const c2 = cells[id]; for (const i of c2.px) { c2.sx += i % LW; c2.sy += (i / LW) | 0; } c2.cx = c2.sx / c2.px.length; c2.cy = c2.sy / c2.px.length; }
    layerData = lg.createImageData(LW, LH);
  }
  function fillCell(id, col) {
    if (!id || !cells[id] || filled[id] === col) return false;
    filled[id] = col;
    const r = parseInt(col.slice(1, 3), 16), gg = parseInt(col.slice(3, 5), 16), b = parseInt(col.slice(5, 7), 16);
    const c = cells[id];
    for (const i of c.px) {
      // a little bevel: lighter near the top-left of each piece
      const x = i % LW, y = (i / LW) | 0;
      const k = (x - c.cx) + (y - c.cy) < -2 ? 1.18 : (x - c.cx) + (y - c.cy) > 3 ? 0.82 : 1;
      layerData.data[i * 4] = Math.min(255, r * k); layerData.data[i * 4 + 1] = Math.min(255, gg * k); layerData.data[i * 4 + 2] = Math.min(255, b * k); layerData.data[i * 4 + 3] = 255;
    }
    lg.putImageData(layerData, 0, 0);
    return true;
  }
  const pos = () => ({ x: Math.round(W / 2 - LW / 2 - 40), y: Math.round(H / 2 - LH / 2) });
  function at(x, y) {
    const p = pos(), lx = Math.floor(x - p.x), ly = Math.floor(y - p.y);
    if (!cellIds) return 0;
    // taps on the 1px grout snap to the nearest piece
    for (let r = 0; r <= 3; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const X = lx + dx, Y = ly + dy;
      if (X < 0 || Y < 0 || X >= LW || Y >= LH) continue;
      const id = cellIds[Y * LW + X];
      if (id) return id;
    }
    return 0;
  }
  const scene = {
    t: 0,
    start() {
      init();
      miniTools.innerHTML = '';
      miniTools.append(
        swatches(colors, (i) => { color = i; }),
        (() => { const row = document.createElement('div'); row.className = 'tool-row';
          row.append(
            toolButton('random', () => { ids.forEach((id) => { if (!filled[id]) fillCell(id, pick(colors)); }); SFX.pop(); }, 'sm'),
            toolButton('clear', () => { filled = {}; layerData = lg.createImageData(LW, LH); lg.clearRect(0, 0, LW, LH); SFX.back(); }, 'sm'),
          );
          return row; })(),
        toolButton('light it ✓', () => this.done(), 'green'),
      );
      miniTools.classList.remove('hidden');
      setHud('tap the pieces to add glass');
    },
    done() {
      if (lit >= 0) return;
      if (!Object.keys(filled).length) { toast('add some glass first :)'); return; }
      this.mine = Object.keys(filled).length; this.auto = ids.length - this.mine;
      ids.forEach((id) => { if (!filled[id]) fillCell(id, pick(colors)); });
      lit = 0; clearMiniUi(); SFX.heart();
    },
    pointer(type, x, y) {
      if (this.phase !== 'play' || lit >= 0) return;
      if (type === 'down' || type === 'move') { if (fillCell(at(x, y), colors[color])) SFX.pop(); }
    },
    update(dt) {
      this.t += dt; updateParticles(dt);
      if (lit >= 0) {
        lit += dt;
        if (lit > 2.6 && !result) {
          const [c, g] = makeCanvas(LW, LH);
          g.drawImage(layer, 0, 0); if (ok('m_lamp_frame')) g.drawImage(IMG.m_lamp_frame, 0, 0);
          result = { img: c.toDataURL(), canvas: c, mine: this.mine, auto: this.auto };
        }
        if (lit > 3.2) { lit = -5; this.finish(result); }
      }
    },
    draw() {
      const g = ctx;
      const dark = lit >= 0 ? Math.min(0.82, 0.5 + lit * 0.3) : 0.45;
      drawDimScene('s_mosaic', dark);
      const p = lit >= 0 ? { x: Math.round(W / 2 - LW / 2), y: pos().y } : pos();
      if (lit >= 0) {
        // warm core glow + coloured light spilling on the walls
        glow(g, p.x + 64.5, p.y + 64, 70, '#f8c070', Math.min(0.35, lit * 0.2));
        for (const id of ids) { const c = cells[id]; if (filled[id] && c.px.length > 30) glow(g, p.x + c.cx, p.y + c.cy, 40 + (id % 3) * 10, filled[id], 0.08 + Math.min(0.12, lit * 0.05) + Math.sin(this.t * 2 + id) * 0.02); }
      }
      g.drawImage(layer, p.x, p.y);
      if (ok('m_lamp_frame')) g.drawImage(IMG.m_lamp_frame, p.x, p.y); else placeholder(g, p.x, p.y, LW, LH);
      if (lit >= 0) for (const id of ids) { const c = cells[id]; if (filled[id]) glow(g, p.x + c.cx, p.y + c.cy, 10, filled[id], 0.35); }
      drawParticles(g);
    },
  };
  return {
    title: 'mosaic lamp',
    help: ['pick a glass colour, then tap (or swipe over) the pieces of the lamp.', 'when you\'re happy, light it up.'],
    scene,
    end: (r) => ({ title: 'look at it glow', lines: ['this would look so good in our room', 'in real life we make one each, it takes a few hours'], art: artCanvas(r.canvas, 96) }),
  };
}

// =============== catch: popcorn / beads ===============
function catchGame(kind) {
  const isPop = kind === 'popcorn';
  const dur = 25;
  let items = [], px = 0, spawn = 0, score = 0, caught = [], flash = 0, time = 0, target = null, spoilers = 0;
  const by = () => H - 22;
  const scene = {
    t: 0,
    start() { px = W / 2; items = []; score = 0; caught = []; time = 0; this.hud(); },
    hud() { setHud(`${isPop ? 'popcorn' : 'beads'} <b>${score}</b> &nbsp;·&nbsp; ${fmtTime(Math.max(0, dur - time))}`); },
    pointer(type, x) { if (this.phase === 'play') target = type === 'up' ? null : x; },
    update(dt) {
      this.t += dt; updateParticles(dt);
      if (this.phase !== 'play') return;
      time += dt; flash = Math.max(0, flash - dt * 2);
      let vx = (held('left') ? -1 : 0) + (held('right') ? 1 : 0);
      if (vx) { px += vx * 170 * dt; target = null; }
      else if (target != null) px += clamp(target - px, -260 * dt, 260 * dt);
      px = clamp(px, 18, W - 18);
      spawn -= dt;
      if (spawn <= 0 && time < dur - 1) {
        spawn = 0.5 - (time / dur) * 0.22;
        let type;
        if (isPop) { const v = Math.random(); type = v < 0.18 && time > 2 ? 3 : v < 0.24 ? 4 : irnd(0, 2); }
        else type = irnd(0, 9);
        items.push({ x: rnd(14, W - 14), y: -10, vy: rnd(55, 85) + time * 2.2, ph: rnd(0, 6), sway: rnd(2, 10), type, rot: 0 });
      }
      const y0 = by();
      for (const it of items) {
        it.y += it.vy * dt; it.x += Math.sin(time * 3 + it.ph) * it.sway * dt;
        const hw = isPop ? 15 : 22;
        if (!it.gone && it.y > y0 - 16 && it.y < y0 - 2 && Math.abs(it.x - px) < hw) {
          it.gone = true;
          if (isPop && it.type === 3) { score = Math.max(0, score - 3); spoilers++; flash = 0.5; SFX.bad(); toast('spoiler!! -3'); }
          else { score += isPop && it.type === 4 ? 3 : 1; caught.push(it.type); SFX.coin(); burst(it.x, y0 - 14, isPop && it.type === 4 ? 'heart' : 'spark', 2); }
          this.hud();
        } else if (!it.gone && it.y > H + 12) it.gone = true;
      }
      items = items.filter((it) => !it.gone);
      if (Math.floor(time * 4) !== Math.floor((time - dt) * 4)) this.hud();
      if (time >= dur) { this.phase = 'over'; items = []; if (!isPop) save.beads = caught.slice(0, 24); this.finish({ score, spoilers, caught: caught.slice(0, 24) }); }
    },
    draw() {
      drawDimScene(isPop ? 's_cinema' : 's_beads', 0.4);
      const g = ctx;
      if (flash > 0) { g.fillStyle = `rgba(216,74,82,${flash * 0.6})`; g.fillRect(0, 0, W, H); }
      for (const it of items) {
        if (isPop) frame(g, 'm_popcorn', 16, 16, it.type, 0, it.x - 8, it.y - 8);
        else frame(g, 'm_beads', 12, 12, it.type, 0, it.x - 6, it.y - 6);
      }
      const y0 = by();
      if (isPop) frame(g, 'm_bucket', 32, 32, 0, 0, px - 16, y0 - 24);
      else {
        caught.slice(-6).forEach((t, i) => frame(g, 'm_beads', 12, 12, t, 0, px - 20 + i * 6, y0 - 12 - (i % 2)));
        frame(g, 'm_bowl', 48, 24, 0, 0, px - 24, y0 - 14);
      }
      drawParticles(g);
    },
  };
  return {
    title: isPop ? 'popcorn time' : 'catch the beads',
    help: isPop
      ? ['slide your finger to move the bucket and catch the popcorn.', 'golden ones = +3. dodge the red spoilers!']
      : ['slide your finger to move the tray and catch beads for your bracelet.', 'every bead you catch goes on it.'],
    scene,
    end: (r) => {
      if (isPop) return { title: r.score + ' popcorn!', lines: [r.score > 30 ? 'you\'re literally a machine' : 'enough for both of us', 'and zero spoilers. perfect'], art: null };
      const [c, g] = makeCanvas(96, 96);
      const beads = r.caught.length ? r.caught : [0, 1, 2];
      const n = clamp(beads.length, 12, 22);
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 - Math.PI / 2; frame(g, 'm_beads', 12, 12, beads[i % beads.length], 0, 48 + Math.cos(a) * 32 - 6, 48 + Math.sin(a) * 32 - 6); }
      return { title: r.score + ' beads!', lines: ['here\'s your bracelet', 'now make me one too. matching ones. rules are rules'], art: artCanvas(c, 96) };
    },
  };
}

// =============== flea market: find the items ===============
function findGame() {
  const targets = [0, 1, 2, 3, 4];
  const names = ['green vase', 'cat figurine', 'vinyl', 'old camera', 'round sunglasses'];
  let items = [], found = new Set(), hintT = 0, shake = null, time = 0;
  const layout = () => {
    const sw = Math.min(W - 16, 420), sx = Math.round((W - sw) / 2);
    const rows = 3, top = 34, gap = Math.floor((H - top - 10) / rows);
    return { sw, sx, rows, top, gap };
  };
  const scene = {
    t: 0,
    start() {
      const L = layout();
      const perRow = Math.floor(L.sw / 22);
      const total = perRow * L.rows;
      const pool = [];
      for (let i = 0; i < total - targets.length; i++) pool.push(irnd(5, 15));
      const list = [...targets, ...pool].sort(() => Math.random() - 0.5);
      items = list.map((k, i) => {
        const r = Math.floor(i / perRow), c = i % perRow;
        return { k, x: L.sx + 4 + c * (L.sw - 8) / perRow + irnd(-2, 2), y: L.top + r * L.gap + L.gap - 26 + irnd(-1, 0), i };
      });
      found = new Set(); time = 0; this.hud();
    },
    hud() {
      setHud(targets.map((k) => `<span class="find ${found.has(k) ? 'got' : ''}"><canvas data-item="${k}" width="16" height="16"></canvas></span>`).join(''));
      miniHud.querySelectorAll('canvas[data-item]').forEach((c) => paintIcon(c, 'flea', +c.dataset.item));
    },
    pointer(type, x, y) {
      if (this.phase !== 'play' || type !== 'down') return;
      let best = null, bd = 13;
      for (const it of items) { if (it.gone) continue; const d = Math.hypot(x - (it.x + 8), y - (it.y + 8)); if (d < bd) { bd = d; best = it; } }
      if (!best) return;
      if (targets.includes(best.k) && !found.has(best.k)) {
        found.add(best.k); best.gone = true; hintT = 0; SFX.coin(); burst(best.x + 8, best.y + 8, 'heart', 4);
        toast(names[best.k] + ' found!');
        this.hud();
        if (found.size === targets.length) { this.phase = 'over'; setTimeout(() => this.finish({ time: Math.round(time) }), 500); }
      } else { shake = { it: best, t: 0 }; SFX.back(); }
    },
    update(dt) {
      this.t += dt; updateParticles(dt);
      if (this.phase !== 'play') return;
      time += dt; hintT += dt;
      if (shake) { shake.t += dt; if (shake.t > 0.3) shake = null; }
    },
    draw() {
      drawDimScene('s_flea', 0.25);
      const g = ctx, L = layout();
      for (let r = 0; r < L.rows; r++) {
        const ty = L.top + r * L.gap + L.gap - 20;
        for (let x = L.sx - 8; x < L.sx + L.sw + 8; x += 96) {
          if (ok('m_table')) g.drawImage(IMG.m_table, 0, 0, Math.min(96, L.sx + L.sw + 8 - x), 32, x, ty, Math.min(96, L.sx + L.sw + 8 - x), 32);
          else placeholder(g, x, ty, 96, 20, '#9c6440');
        }
      }
      const hint = this.phase === 'play' && hintT > 12;
      for (const it of items) {
        if (it.gone) continue;
        let ox = 0;
        if (shake && shake.it === it) ox = Math.round(Math.sin(shake.t * 40) * 2);
        if (hint && targets.includes(it.k) && !found.has(it.k) && Math.floor(this.t * 3) % 2) glow(g, it.x + 8, it.y + 8, 14, '#fff6b8', 0.6);
        frame(g, 'flea', 16, 16, it.k, 0, it.x + ox, it.y);
      }
      drawParticles(g);
    },
  };
  return {
    title: 'treasure hunt',
    help: ['find the 5 things shown at the top before someone else buys them!', 'tap them on the tables.'],
    scene,
    end: (r) => ({ title: 'found everything', lines: [`all 5 in ${r.time} seconds`, 'we\'re taking the cat figurine home obviously'], art: null }),
  };
}

// =============== ikea maze ===============
function mazeGame() {
  let cols, rows, grid, path = [], pos, drawPos, goal, moveT = 0, time = 0, deco = {}, dir = 'down', walkT = 0;
  function gen() {
    cols = Math.max(9, Math.floor((W - 8) / TS)); if (cols % 2 === 0) cols--;
    rows = Math.max(7, Math.floor((H - 26) / TS)); if (rows % 2 === 0) rows--;
    grid = Array.from({ length: rows }, () => new Array(cols).fill(1));
    const stack = [[1, 1]]; grid[1][1] = 0;
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const nb = [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([dx, dy]) => [x + dx, y + dy, dx, dy]).filter(([nx, ny]) => nx > 0 && ny > 0 && nx < cols - 1 && ny < rows - 1 && grid[ny][nx]);
      if (!nb.length) { stack.pop(); continue; }
      const [nx, ny, dx, dy] = pick(nb);
      grid[y + dy / 2][x + dx / 2] = 0; grid[ny][nx] = 0; stack.push([nx, ny]);
    }
    for (let i = 0; i < Math.floor(cols * rows / 40); i++) { // a few loops so it's friendlier
      const x = irnd(1, cols - 2), y = irnd(1, rows - 2);
      if (grid[y][x] && ((grid[y][x - 1] === 0 && grid[y][x + 1] === 0) || (grid[y - 1][x] === 0 && grid[y + 1][x] === 0))) grid[y][x] = 0;
    }
    goal = { x: cols - 2, y: rows - 2 };
    // solution
    const prev = {}, q = [[1, 1]], k = (x, y) => x + ',' + y; prev[k(1, 1)] = null;
    while (q.length) { const [x, y] = q.shift(); if (x === goal.x && y === goal.y) break; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!grid[ny][nx] && !(k(nx, ny) in prev)) { prev[k(nx, ny)] = [x, y]; q.push([nx, ny]); } } }
    path = []; for (let c = [goal.x, goal.y]; c; c = prev[k(c[0], c[1])]) path.unshift(c);
    deco = {};
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) deco[x + ',' + y] = Math.random();
    pos = { x: 1, y: 1 }; drawPos = { x: 1, y: 1 };
  }
  const origin = () => ({ x: Math.round((W - cols * TS) / 2), y: Math.round((H - rows * TS) / 2) + 8 });
  function step(d) {
    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d];
    dir = d;
    if (grid[pos.y + v[1]][pos.x + v[0]]) return false;
    pos.x += v[0]; pos.y += v[1]; SFX.step();
    return true;
  }
  const scene = {
    t: 0,
    start() { gen(); time = 0; },
    pointer() {},
    update(dt) {
      this.t += dt; updateParticles(dt);
      if (!grid) gen();
      const moving = Math.abs(drawPos.x - pos.x) + Math.abs(drawPos.y - pos.y) > 0.02;
      drawPos.x += clamp(pos.x - drawPos.x, -dt * 7, dt * 7);
      drawPos.y += clamp(pos.y - drawPos.y, -dt * 7, dt * 7);
      if (moving) walkT += dt;
      if (this.phase !== 'play') return;
      time += dt; moveT -= dt;
      setHud('find the vegan meatballs &nbsp;·&nbsp; ' + fmtTime(time));
      if (moveT <= 0 && !moving) {
        let d = null;
        for (const k of ['up', 'down', 'left', 'right']) if (held(k)) d = k;
        if (!d && ptr.down) {
          const o = origin();
          const dx = ptr.x - (o.x + pos.x * TS + 8), dy = ptr.y - (o.y + pos.y * TS + 8);
          if (Math.hypot(dx, dy) > 8) {
            const prim = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
            const sec = Math.abs(dx) > Math.abs(dy) ? (dy > 0 ? 'down' : 'up') : (dx > 0 ? 'right' : 'left');
            if (!step(prim) && Math.min(Math.abs(dx), Math.abs(dy)) > 6) step(sec);
            moveT = 0.02;
          }
        } else if (d) { step(d); moveT = 0.02; }
      }
      if (pos.x === goal.x && pos.y === goal.y && !moving) {
        this.phase = 'over';
        const o = origin(); burst(o.x + goal.x * TS + 8, o.y + goal.y * TS, 'heart', 8); SFX.win();
        setTimeout(() => this.finish({ time: Math.round(time) }), 700);
      }
    },
    draw() {
      const g = ctx;
      g.fillStyle = '#1a56a8'; g.fillRect(0, 0, W, H);
      if (!grid) return;
      const o = origin();
      const tile = (i, x, y) => frame(g, 'm_maze', 16, 16, i, 0, o.x + x * TS, o.y + y * TS);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (!grid[y][x]) tile((x + y) % 2, x, y);
      // floor arrows along the way (every other tile, like in the real store)
      for (let i = 0; i < path.length - 1; i += 2) {
        const [x, y] = path[i], [nx, ny] = path[i + 1];
        tile(nx > x ? 3 : nx < x ? 5 : ny > y ? 4 : 2, x, y);
      }
      tile(11, 1, 1); tile(10, goal.x, goal.y);
      const pr = Math.round(drawPos.y);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (!grid[y][x]) continue;
          const below = y + 1 < rows ? grid[y + 1][x] : 1;
          let t = below ? 6 : 7;
          if (!below) { const d = deco[x + ',' + y]; if (d < 0.12) t = 8; else if (d < 0.2) t = 9; }
          tile(t, x, y);
        }
        if (y === pr) drawChar(g, 'her', o.x + drawPos.x * TS + 8, o.y + drawPos.y * TS + 14, dir, Math.abs(drawPos.x - pos.x) + Math.abs(drawPos.y - pos.y) > 0.02, walkT);
      }
      drawParticles(g);
    },
  };
  return {
    title: 'ikea maze',
    help: ['get to the vegan meatballs! hold your finger where you want to walk.', 'the yellow arrows on the floor show the way, like in the real store.'],
    scene,
    end: (r) => ({ title: 'vegan meatballs reached', lines: [`made it in ${r.time} seconds`, 'vegan köttbullar + lingonberry. elite'], art: null }),
  };
}

// =============== cabin: fireflies ===============
function fireflyGame() {
  const goal = 10;
  let flies = [], jar = 0, time = 0;
  const jarPos = () => ({ x: W - 40, y: H - 42 });
  const scene = {
    t: 0,
    start() {
      flies = Array.from({ length: 16 }, () => ({ x: rnd(20, W - 20), y: rnd(20, H * 0.7), ph: rnd(0, 6), sp: rnd(0.5, 1.3), ax: rnd(12, 30), st: 'free', t: rnd(0, 9) }));
      jar = 0; this.hud();
    },
    hud() { setHud(`fireflies <b>${jar}/${goal}</b>`); },
    pointer(type, x, y) {
      if (this.phase !== 'play' || type !== 'down') return;
      let best = null, bd = 20;
      for (const f of flies) if (f.st === 'free') { const d = Math.hypot(f.x - x, f.y - y); if (d < bd) { bd = d; best = f; } }
      if (best) { best.st = 'fly'; SFX.pop(); burst(best.x, best.y, 'spark', 2); }
    },
    update(dt) {
      this.t += dt; updateParticles(dt);
      if (this.phase === 'play') time += dt;
      const jp = jarPos();
      for (const f of flies) {
        f.t += dt;
        if (f.st === 'free') {
          f.x += Math.cos(f.t * f.sp + f.ph) * f.ax * dt; f.y += Math.sin(f.t * f.sp * 1.3 + f.ph) * f.ax * 0.7 * dt;
          f.x = clamp(f.x, 8, W - 8); f.y = clamp(f.y, 10, H - 30);
        } else if (f.st === 'fly') {
          f.x += (jp.x + 12 - f.x) * Math.min(1, dt * 5); f.y += (jp.y + 14 - f.y) * Math.min(1, dt * 5);
          if (Math.hypot(jp.x + 12 - f.x, jp.y + 14 - f.y) < 4) { f.st = 'in'; jar++; SFX.coin(); this.hud(); }
        }
      }
      if (this.phase === 'play' && jar >= goal) { this.phase = 'over'; SFX.heart(); setTimeout(() => this.finish({ jar, time: Math.round(time) }), 900); }
    },
    draw() {
      const g = ctx;
      drawDimScene('s_cabin', 0.35);
      const { ox, oy } = sceneOffset();
      frame(g, 'm_campfire', 32, 32, Math.floor(this.t * 8) % 4, 0, 150 - ox - 16, 216 - oy - 31);
      glow(g, 150 - ox, 214 - oy - 8, 50, '#f0944a', 0.3 + Math.sin(this.t * 9) * 0.04);
      drawChar(g, 'her', 227 - ox, 197 - oy, 'down', false, this.t, 'sit');
      drawChar(g, 'him', 253 - ox, 197 - oy, 'down', false, this.t + 1.3, 'sit');
      for (const f of flies) {
        if (f.st === 'in') continue;
        const pulse = (Math.sin(f.t * 4 + f.ph) + 1) / 2;
        glow(g, f.x, f.y, 9, '#d0ec8a', 0.25 + pulse * 0.35);
        frame(g, 'm_firefly', 8, 8, Math.floor((f.t * 6 + f.ph) % 4), 0, f.x - 4, f.y - 4);
      }
      const jp = jarPos();
      if (jar) glow(g, jp.x + 12, jp.y + 18, 18 + jar * 1.5, '#d0ec8a', 0.15 + jar * 0.04);
      for (let i = 0; i < jar; i++) R(g, jp.x + 5 + ((i * 7) % 14), jp.y + 12 + ((i * 11) % 14) + Math.round(Math.sin(this.t * 3 + i)), 2, 2, '#fff6b8');
      frame(g, 'm_jar', 24, 32, 0, 0, jp.x, jp.y);
      drawParticles(g);
    },
  };
  return {
    title: 'fireflies',
    help: ['it got dark at the cabin...', `tap ${goal} fireflies to fill the jar.`],
    scene,
    end: () => ({ title: 'a jar full of stars', lines: ['now imagine that for real. no city lights, just us and the forest'], art: null }),
  };
}

const MINIGAMES = { mug: mugGame, lamp: lampGame, beads: () => catchGame('beads'), popcorn: () => catchGame('popcorn'), find: findGame, maze: mazeGame, fireflies: fireflyGame };
