'use strict';
// the town: terrain (dual-grid autotiles), buildings, trees, cats, tap-to-walk with A* pathfinding

const MW = 52, MH = 41;
const GRASS = 0, PATH = 1, PLAZA = 2, WATER = 3;
let terr = [], solid = [];

// buildings: tx = left tile, by = tile row right below the building (the street row in front of the door)
const BUILDINGS = [
  { id: 'cinema', key: 'b_cinema', w: 112, h: 96, tx: 4, by: 12, date: 'cinema', name: 'cinema' },
  { id: 'ceramics', key: 'b_ceramics', w: 96, h: 88, tx: 13, by: 12, date: 'ceramics', name: 'ceramics studio' },
  { id: 'house_a', key: 'b_house_a', w: 80, h: 80, tx: 30, by: 12, flavor: 'someone lives here. let\'s not ring the bell lol' },
  { id: 'mosaic', key: 'b_mosaic', w: 96, h: 96, tx: 36, by: 12, date: 'mosaic', name: 'orient art studio' },
  { id: 'beads', key: 'b_beads', w: 96, h: 88, tx: 43, by: 12, date: 'beads', name: 'takaay' },
  { id: 'house_b', key: 'b_house_b', w: 80, h: 80, tx: 40, by: 24, flavor: 'this house has a cat flap. respect' },
  { id: 'ikea', key: 'b_ikea', w: 144, h: 96, tx: 3, by: 36, date: 'ikea', name: 'ikea' },
  { id: 'flea', key: 'b_flea', w: 144, h: 96, tx: 14, by: 36, date: 'flea', name: 'flea market' },
  { id: 'cafe', key: 'b_cafe', w: 96, h: 80, tx: 28, by: 36, flavor: 'cute café. we can grab a coffee here after our date' },
  { id: 'busstop', key: 'b_busstop', w: 64, h: 48, tx: 37, by: 36, date: 'cabin', name: 'bus to brandenburg' },
  { id: 'bus', key: 'b_bus', w: 80, h: 48, tx: 41, by: 36, flavor: 'the bus to the woods. hop on at the bus stop sign' },
];
for (const b of BUILDINGS) {
  b.x = b.tx * TS; b.y = b.by * TS - b.h; // top-left in px
  b.doorX = Math.floor((b.x + b.w / 2 - 1) / TS); b.doorY = b.by;
}
const FOUNTAIN = { cx: 416, base: 332, x: 384, y: 272, w: 64, h: 64 };

const statics = []; // drawn y-sorted with the characters
let groundLayer = null, waterTiles = [];

function buildWorld() {
  terr = []; solid = [];
  for (let y = 0; y < MH; y++) { terr.push(new Array(MW).fill(GRASS)); solid.push(new Array(MW).fill(0)); }
  const fill = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (terr[y] && x >= 0 && x < MW) terr[y][x] = t; };
  fill(2, 12, 49, 13, PATH);
  fill(2, 25, 49, 26, PATH);
  fill(2, 36, 49, 37, PATH);
  fill(25, 2, 26, 38, PATH);
  fill(20, 15, 31, 23, PLAZA);
  fill(42, 24, 42, 24, PATH); // house_b front step
  fill(4, 16, 10, 21, WATER);
  for (const [x, y] of [[4, 16], [10, 16], [4, 21], [10, 21], [5, 16], [10, 17]]) terr[y][x] = GRASS;
  // solids
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (x < 2 || x >= MW - 2 || y < 2 || y >= MH - 2) solid[y][x] = 1;
    if (terr[y][x] === WATER) solid[y][x] = 1;
  }
  for (const b of BUILDINGS) {
    const rows = Math.ceil(b.h / TS);
    for (let y = b.by - rows; y < b.by; y++) for (let x = b.tx; x < b.tx + b.w / TS; x++) solid[y][x] = 1;
  }
  for (let y = 18; y <= 20; y++) for (let x = 24; x <= 27; x++) solid[y][x] = 1; // fountain basin

  statics.length = 0;
  const free = (x, y) => x >= 2 && y >= 2 && x < MW - 2 && y < MH - 2 && !solid[y][x] && terr[y][x] === GRASS;
  const nearRoad = (x, y) => {
    for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) {
      const t = terr[y + yy] && terr[y + yy][x + xx];
      if (t === PATH || t === PLAZA || (solid[y + yy] && solid[y + yy][x + xx] && !(x + xx < 2 || x + xx >= MW - 2 || y + yy < 2 || y + yy >= MH - 2))) return true;
    }
    return false;
  };
  const addTree = (x, y, kind, v) => {
    const key = kind === 'pine' ? 'treePine' : 'treeRound';
    const cx = x * TS + 8, base = y * TS + 14;
    statics.push({ key, sx: v * 32, sy: 0, sw: 32, sh: 48, x: cx - 16, y: base - 45, base, shadow: [cx, base, 11, 3] });
    if (x >= 0 && y >= 0 && x < MW && y < MH) solid[y][x] = 1;
  };
  // forest border (staggered so it looks dense)
  let seed = 11;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let y = -1; y < MH + 1; y++) for (let x = -1; x < MW + 1; x++) {
    const border = x < 2 || x >= MW - 2 || y < 2 || y >= MH - 2;
    if (!border) continue;
    if ((x + y) % 2 === 0 || r() < 0.35) addTree(x, y, r() < 0.45 ? 'pine' : 'round', r() < 0.5 ? 0 : 1);
  }
  // town trees
  const TREES = [[5, 3], [9, 2], [14, 3], [19, 4], [21, 8], [23, 3], [28, 4], [28, 9], [33, 3], [39, 3], [44, 3], [48, 4], [11, 4],
    [3, 15], [12, 16], [13, 21], [3, 23], [16, 19], [34, 16], [36, 21], [47, 16], [48, 21], [45, 18],
    [12, 29], [13, 33], [23, 30], [24, 34], [27, 29], [47, 29], [48, 33], [46, 31], [35, 30], [2, 28], [18, 28]];
  TREES.forEach(([x, y], i) => { if (free(x, y)) addTree(x, y, i % 5 === 3 ? 'pine' : 'round', i % 7 === 2 ? 2 : i % 2); });
  // props
  const addProp = (key, sx, sy, sw, sh, x, y, ax, ay, solidCells = [[0, 0]], shadow = null) => {
    const px = x * TS + 8, base = y * TS + 15;
    statics.push({ key, sx, sy, sw, sh, x: px - ax, y: base - ay, base, shadow });
    for (const [dx, dy] of solidCells) if (solid[y + dy]) solid[y + dy][x + dx] = 1;
  };
  for (const [x, y] of [[3, 14], [11, 14], [19, 14], [33, 14], [41, 14], [48, 14], [3, 27], [11, 27], [19, 27], [33, 27], [40, 27], [48, 27], [20, 15], [31, 15], [20, 23], [31, 23]]) {
    addProp('lamp', 16, 0, 16, 40, x, y, 8, 38, [[0, 0]], [x * TS + 8, y * TS + 15, 4, 1]);
    statics[statics.length - 1].lamp = true;
  }
  for (const [x, y] of [[22, 16], [28, 16], [22, 22], [29, 22]]) addProp('bench', 0, 0, 32, 24, x, y, 8, 23, [[0, 0], [1, 0]]);
  addProp('signpost', 0, 0, 32, 32, 23, 24, 16, 31, [[0, 0]]);
  // bushes + flowers on free grass
  seed = 5;
  for (let y = 2; y < MH - 2; y++) for (let x = 2; x < MW - 2; x++) {
    if (!free(x, y) || nearRoad(x, y)) continue;
    const v = r();
    if (v < 0.07) addProp('bushes', (v < 0.02 ? 2 : v < 0.045 ? 0 : 1) * 16, 0, 16, 16, x, y, 8, 15, [[0, 0]], [x * TS + 8, y * TS + 14, 6, 2]);
    else if (v < 0.11) addProp('props', (3 + Math.floor(r() * 3)) * 16, 16, 16, 16, x, y, 8, 15, []);
    else if (v < 0.125) { const [px, py] = [[0, 0], [3, 0], [6, 1]][Math.floor(r() * 3)]; addProp('props', px * 16, py * 16, 16, 16, x, y, 8, 15, [[0, 0]]); }
  }
  statics.push({ fountain: true, base: FOUNTAIN.base, x: FOUNTAIN.x, y: FOUNTAIN.y });
  for (const b of BUILDINGS) statics.push({ key: b.key, sx: 0, sy: 0, sw: b.w, sh: b.h, x: b.x, y: b.y, base: b.y + b.h, building: b });
  renderGround();
}

// ---------- ground (dual grid) ----------
function terrAt(x, y) { if (x < 0 || y < 0 || x >= MW || y >= MH) return GRASS; return terr[y][x]; }
const BLOCK_ROW = { [PATH]: 0, [PLAZA]: 4, [WATER]: 8 };
function hash2(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return (h ^ (h >>> 16)) >>> 0; }
function groundTileFor(dx, dy) {
  const c = [terrAt(dx, dy), terrAt(dx + 1, dy), terrAt(dx, dy + 1), terrAt(dx + 1, dy + 1)];
  const present = c.filter((t) => t !== GRASS);
  const h = hash2(dx, dy);
  if (!present.length) {
    const v = h % 100;
    if (v < 50) return [0, 0];
    if (v < 90) return [[2, 13], [3, 13], [3, 14], [3, 15]][h % 4];
    return [[0, 14], [1, 14], [2, 14], [0, 15], [1, 15], [2, 15]][(h >>> 8) % 6];
  }
  const t = present.includes(PLAZA) ? PLAZA : present.includes(PATH) ? PATH : WATER;
  const m = (c[0] !== GRASS ? 8 : 0) | (c[1] !== GRASS ? 4 : 0) | (c[2] !== GRASS ? 2 : 0) | (c[3] !== GRASS ? 1 : 0);
  if (m === 15) {
    if (t === PATH && h % 4 === 0) return [(h >>> 4) % 2, 12];
    if (t === PLAZA && h % 10 === 0) return [2, 12];
    if (t === WATER) return [3, 11, 'water'];
  }
  return [m % 4, BLOCK_ROW[t] + Math.floor(m / 4)];
}
function renderGround() {
  const [c, g] = makeCanvas(MW * TS, MH * TS);
  waterTiles = [];
  g.fillStyle = '#4a8f46'; g.fillRect(0, 0, c.width, c.height);
  for (let dy = -1; dy < MH; dy++) for (let dx = -1; dx < MW; dx++) {
    const [col, row, kind] = groundTileFor(dx, dy);
    const px = dx * TS + 8, py = dy * TS + 8;
    if (ok('terrain')) g.drawImage(IMG.terrain, col * TS, row * TS, TS, TS, px, py, TS, TS);
    else { g.fillStyle = row >= 8 && row < 12 && col === 3 ? '#4a86cf' : row < 4 && (col || row) ? '#c7ad80' : '#6fb14e'; g.fillRect(px, py, TS, TS); }
    if (kind === 'water') waterTiles.push([px, py, hash2(dx + 7, dy + 3) % 4]);
  }
  // soft ground shadows under buildings / trees / props
  for (const s of statics) {
    if (s.building) {
      const b = s.building;
      g.fillStyle = 'rgba(27,20,36,.20)';
      g.fillRect(b.x + 3, b.y + b.h - 2, b.w - 2, 4);
      for (let i = 0; i < 7; i++) g.fillRect(b.x + b.w + i - 1, b.y + 22 + i * 2, 1, b.h - 22 - i * 2 + 1);
    } else if (s.shadow) {
      const [x, y, rx, ry] = s.shadow;
      ellipseShadow(g, x + 2, y, rx, ry, 0.22);
    } else if (s.fountain) ellipseShadow(g, FOUNTAIN.cx + 2, FOUNTAIN.base - 2, 30, 6, 0.18);
  }
  groundLayer = c;
}

// ---------- walking / pathfinding ----------
function solidCell(x, y) { return x < 0 || y < 0 || x >= MW || y >= MH || !!solid[y][x]; }
function isSolidPx(px, py) { return solidCell(Math.floor(px / TS), Math.floor(py / TS)); }
function boxFree(x, y) { return !isSolidPx(x - 5, y - 4) && !isSolidPx(x + 4, y - 4) && !isSolidPx(x - 5, y) && !isSolidPx(x + 4, y); }
function nearestWalkable(tx, ty, fromX, fromY) {
  let best = null, bd = 1e9;
  for (let r = 0; r < 8 && !best; r++) {
    for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) {
      if (Math.max(Math.abs(x - tx), Math.abs(y - ty)) !== r || solidCell(x, y)) continue;
      const d = Math.hypot(x - tx, y - ty) * 10 + (fromX != null ? Math.hypot(x - fromX, y - fromY) * 0.01 : 0);
      if (d < bd) { bd = d; best = [x, y]; }
    }
  }
  return best;
}
function findPath(sx, sy, tx, ty) {
  if (solidCell(sx, sy)) { const n = nearestWalkable(sx, sy); if (!n) return null; [sx, sy] = n; }
  if (solidCell(tx, ty)) { const n = nearestWalkable(tx, ty, sx, sy); if (!n) return null; [tx, ty] = n; }
  const idx = (x, y) => y * MW + x;
  const gS = new Float32Array(MW * MH).fill(Infinity), came = new Int32Array(MW * MH).fill(-1), closed = new Uint8Array(MW * MH);
  const heap = [];
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, rr = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (rr < heap.length && heap[rr][0] < heap[m][0]) m = rr; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const hFn = (x, y) => { const dx = Math.abs(x - tx), dy = Math.abs(y - ty); return dx + dy + (1.414 - 2) * Math.min(dx, dy); };
  gS[idx(sx, sy)] = 0; push(hFn(sx, sy), idx(sx, sy));
  const DIR8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (heap.length) {
    const [, cur] = pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % MW, cy = (cur / MW) | 0;
    if (cx === tx && cy === ty) break;
    for (const [dx, dy, cost] of DIR8) {
      const nx = cx + dx, ny = cy + dy;
      if (solidCell(nx, ny)) continue;
      if (dx && dy && (solidCell(cx + dx, cy) || solidCell(cx, cy + dy))) continue;
      const ni = idx(nx, ny), ng = gS[cur] + cost;
      if (ng < gS[ni]) { gS[ni] = ng; came[ni] = cur; push(ng + hFn(nx, ny), ni); }
    }
  }
  const end = idx(tx, ty);
  if (!closed[end]) return null;
  const cells = [];
  for (let c = end; c !== -1; c = came[c]) cells.unshift([c % MW, (c / MW) | 0]);
  return cells;
}
function lineFree(a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(d / 3);
  for (let k = 1; k <= n; k++) { const t = k / n; if (!boxFree(lerp(a.x, b.x, t), lerp(a.y, b.y, t))) return false; }
  return true;
}
function smoothPath(start, pts) {
  const out = []; let cur = start, i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !lineFree(cur, pts[j])) j--;
    out.push(pts[j]); cur = pts[j]; i = j + 1;
  }
  return out;
}

// ---------- the world scene ----------
const world = {
  her: { x: 0, y: 0, dir: 'down', moving: false, t: 0 },
  him: { x: 0, y: 0, dir: 'down', moving: false, t: 0 },
  trail: [],
  path: [],
  pending: null,
  marker: null,
  cats: [],
  cam: { x: 0, y: 0 },
  frozen: false,
  stepT: 0,
  dragT: 0,
  ready: false,
  enter() { playMusic('town'); showHud(true); },
  init() {
    buildWorld();
    // spread over the whole town, two of them right on the square so she meets some early
    const homes = [[23, 21], [11, 14], [13, 38], [34, 38], [12, 23], [30, 20], [20, 27], [44, 14], [46, 26], [6, 27]];
    this.cats = C.cats.map((cat, i) => {
      let [hx, hy] = homes[i % homes.length];
      if (solidCell(hx, hy)) [hx, hy] = nearestWalkable(hx, hy) || [hx, hy];
      const x = hx * TS + 8, y = hy * TS + 12;
      return { cat, idx: cat.row != null ? cat.row : i % 5, x, y, hx: x, hy: y, tx: null, ty: null, wait: rnd(1, 4), flip: false, happy: 0, hold: 0, mode: 'sit', t: rnd(0, 5) };
    });
    this.ready = true;
  },
  placeAt(tx, ty, dir = 'down') {
    const h = this.her, m = this.him;
    h.x = tx * TS + 8; h.y = ty * TS + 12; h.dir = dir;
    m.x = h.x + 18; m.y = h.y; m.dir = dir;
    if (!boxFree(m.x, m.y)) m.x = h.x - 18;
    this.trail = [{ x: m.x, y: m.y }, { x: h.x, y: h.y }];
    this.path = []; this.pending = null; this.marker = null;
    this.snapCam();
  },
  camTarget() {
    const mw = MW * TS, mh = MH * TS;
    return {
      x: W >= mw ? (mw - W) / 2 : clamp(this.her.x - W / 2, 0, mw - W),
      y: H >= mh ? (mh - H) / 2 : clamp(this.her.y - 16 - H / 2, 0, mh - H),
    };
  },
  snapCam() { const t = this.camTarget(); this.cam.x = t.x; this.cam.y = t.y; },
  resize() { if (this.ready) this.snapCam(); },

  // ----- input -----
  pointer(type, x, y) {
    if (this.frozen || uiStack.length || fade.a > 0.3) return;
    const wx = x + this.cam.x, wy = y + this.cam.y;
    if (type === 'down') { this.dragT = 0; this.tapAt(wx, wy); }
    else if (type === 'move' && ptr.moved) {
      this.pending = null;
      if (this.dragT <= 0) { this.goTo(wx, wy, false); this.dragT = 0.12; }
    }
  },
  tapAt(wx, wy) {
    SFX.tap();
    // cats first (small targets)
    for (const c of this.cats) {
      if (Math.abs(wx - c.x) < 11 && wy > c.y - 16 && wy < c.y + 4) {
        c.hold = 4;
        this.pending = { kind: 'cat', c };
        this.goTo(c.x + (this.her.x < c.x ? -12 : 12), c.y, false);
        return;
      }
    }
    if (wx > FOUNTAIN.x + 4 && wx < FOUNTAIN.x + FOUNTAIN.w - 4 && wy > FOUNTAIN.y + 6 && wy < FOUNTAIN.base) {
      this.pending = { kind: 'fountain' };
      this.goTo(this.her.x < FOUNTAIN.cx - 40 ? FOUNTAIN.x - 4 : this.her.x > FOUNTAIN.cx + 40 ? FOUNTAIN.x + FOUNTAIN.w + 4 : FOUNTAIN.cx, this.her.y < FOUNTAIN.base - 30 ? FOUNTAIN.y + 8 : FOUNTAIN.base + 12, false);
      return;
    }
    for (const b of BUILDINGS) {
      if (wx >= b.x && wx < b.x + b.w && wy >= b.y + 8 && wy < b.y + b.h) {
        this.pending = { kind: 'building', b };
        this.goTo(b.doorX * TS + 8, b.doorY * TS + 10, false);
        return;
      }
    }
    this.pending = null;
    this.goTo(wx, wy, true);
  },
  goTo(wx, wy, showMarker) {
    const h = this.her;
    const sc = [Math.floor(h.x / TS), Math.floor((h.y - 1) / TS)];
    const tc = [Math.floor(wx / TS), Math.floor(wy / TS)];
    const cells = findPath(sc[0], sc[1], tc[0], tc[1]);
    if (!cells) return;
    const pts = cells.slice(1).map(([x, y]) => ({ x: x * TS + 8, y: y * TS + 11 }));
    const last = cells[cells.length - 1];
    if (last[0] === tc[0] && last[1] === tc[1] && boxFree(wx, wy)) pts.push({ x: wx, y: wy });
    this.path = pts.length ? smoothPath({ x: h.x, y: h.y }, pts) : [];
    if (!this.path.length && this.pending) this.arrive();
    if (showMarker) this.marker = { x: wx, y: wy, t: 0 };
  },
  arrive() {
    const p = this.pending;
    if (!p) return;
    const h = this.her;
    if (p.kind === 'cat') {
      if (Math.hypot(p.c.x - h.x, p.c.y - h.y) < 26) { this.pending = null; h.dir = p.c.x < h.x ? 'left' : 'right'; petCat(p.c); }
      else if ((p.tries = (p.tries || 0) + 1) < 4) this.goTo(p.c.x + (h.x < p.c.x ? -12 : 12), p.c.y, false);
      else this.pending = null;
    } else if (p.kind === 'building') {
      const b = p.b;
      this.pending = null;
      if (Math.abs(h.x - (b.doorX * TS + 8)) < 20 && Math.abs(h.y - (b.doorY * TS + 10)) < 20) {
        h.dir = 'up';
        if (b.date) { SFX.door(); enterDate(b.date); }
        else talk([['me', b.flavor]]);
      }
    } else if (p.kind === 'fountain') {
      this.pending = null;
      if (Math.hypot(h.x - FOUNTAIN.cx, h.y - (FOUNTAIN.base - 14)) < 56) fountain();
    }
  },
  nearestInteract() {
    const h = this.her;
    for (const c of this.cats) if (Math.hypot(c.x - h.x, c.y - h.y) < 24) return { kind: 'cat', c };
    for (const b of BUILDINGS) if (Math.abs(h.x - (b.doorX * TS + 8)) < 14 && Math.abs(h.y - (b.doorY * TS + 10)) < 14) return { kind: 'building', b };
    if (Math.hypot(h.x - FOUNTAIN.cx, h.y - (FOUNTAIN.base - 14)) < 50) return { kind: 'fountain' };
    return null;
  },

  // ----- update -----
  update(dt) {
    updateParticles(dt);
    this.dragT -= dt;
    if (this.marker) { this.marker.t += dt; if (this.marker.t > 0.6) this.marker = null; }
    const h = this.her, m = this.him;
    // cats
    for (const c of this.cats) {
      c.t += dt;
      if (c.happy > 0) { c.happy -= dt; c.mode = 'happy'; continue; }
      if (c.hold > 0) { c.hold -= dt; c.mode = 'sit'; c.tx = null; continue; }
      if (c.tx == null) {
        c.mode = c.idx === 1 && Math.sin(T * 0.05) > 0.6 ? 'sleep' : 'sit';
        c.wait -= dt;
        if (c.wait <= 0) { c.tx = c.hx + rnd(-30, 30); c.ty = c.hy + rnd(-18, 18); }
      } else {
        const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
        if (d < 1) { c.tx = null; c.wait = rnd(2, 6); }
        else {
          const nx = c.x + (dx / d) * 16 * dt, ny = c.y + (dy / d) * 16 * dt;
          if (boxFree(nx, ny)) { c.x = nx; c.y = ny; c.flip = dx < 0; c.mode = 'walk'; } else { c.tx = null; c.wait = rnd(1, 3); }
        }
      }
    }
    if (this.frozen || uiStack.length) { h.moving = false; m.moving = false; this.updateCam(dt); return; }
    // keyboard
    let vx = 0, vy = 0;
    if (held('left')) vx -= 1;
    if (held('right')) vx += 1;
    if (held('up')) vy -= 1;
    if (held('down')) vy += 1;
    const sp = 72;
    const ox = h.x, oy = h.y;
    if (vx || vy) {
      this.path = []; this.pending = null;
      if (vx && vy) { vx *= 0.7071; vy *= 0.7071; }
      const nx = h.x + vx * sp * dt, ny = h.y + vy * sp * dt;
      if (boxFree(nx, h.y)) h.x = nx;
      if (boxFree(h.x, ny)) h.y = ny;
    } else if (this.path.length) {
      let budget = sp * dt;
      while (budget > 0 && this.path.length) {
        const p = this.path[0];
        const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy);
        if (d <= budget) { h.x = p.x; h.y = p.y; budget -= d; this.path.shift(); if (!this.path.length) this.arrive(); }
        else { h.x += (dx / d) * budget; h.y += (dy / d) * budget; budget = 0; }
      }
    }
    const mdx = h.x - ox, mdy = h.y - oy;
    h.moving = Math.abs(mdx) + Math.abs(mdy) > 0.01;
    if (h.moving) {
      h.dir = Math.abs(mdx) > Math.abs(mdy) * 1.05 ? (mdx < 0 ? 'left' : 'right') : (mdy < 0 ? 'up' : 'down');
      h.t += dt;
      this.stepT += dt; if (this.stepT > 0.27) { this.stepT = 0; SFX.step(); }
      const lastP = this.trail[this.trail.length - 1];
      if (!lastP || Math.hypot(lastP.x - h.x, lastP.y - h.y) >= 1) { this.trail.push({ x: h.x, y: h.y }); if (this.trail.length > 240) this.trail.shift(); }
    }
    if (hit('a')) { const it = this.nearestInteract(); if (it) { this.pending = it; this.arrive(); } }
    // he follows ~20px behind along her trail
    let need = 20, px = h.x, py = h.y, fx = m.x, fy = m.y;
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const q = this.trail[i], d = Math.hypot(q.x - px, q.y - py);
      if (d >= need) { const t = need / d; fx = px + (q.x - px) * t; fy = py + (q.y - py) * t; need = 0; break; }
      need -= d; px = q.x; py = q.y; fx = q.x; fy = q.y;
    }
    const fdx = fx - m.x, fdy = fy - m.y;
    m.moving = Math.abs(fdx) + Math.abs(fdy) > 0.05;
    if (m.moving) { m.dir = Math.abs(fdx) > Math.abs(fdy) * 1.05 ? (fdx < 0 ? 'left' : 'right') : (fdy < 0 ? 'up' : 'down'); m.x = fx; m.y = fy; m.t += dt; }
    this.updateCam(dt);
    this.updateLabel();
  },
  updateCam(dt) {
    const t = this.camTarget();
    this.cam.x += (t.x - this.cam.x) * Math.min(1, dt * 7);
    this.cam.y += (t.y - this.cam.y) * Math.min(1, dt * 7);
  },
  updateLabel() {
    const lbl = $('#label');
    let best = null, bd = 60;
    for (const b of BUILDINGS) {
      if (!b.date) continue;
      const d = Math.hypot(this.her.x - (b.doorX * TS + 8), this.her.y - (b.doorY * TS + 10));
      if (d < bd) { bd = d; best = b; }
    }
    if (best && !uiStack.length && !this.frozen) {
      lbl.textContent = best.name + (save.done[best.date] ? ' ✓' : '');
      lbl.style.left = (best.doorX * TS + 8 - this.cam.x) * S + 'px';
      lbl.style.top = (best.y - 18 - this.cam.y) * S + 'px';
      lbl.classList.remove('hidden');
    } else lbl.classList.add('hidden');
  },

  // ----- draw -----
  draw() {
    const g = ctx;
    const cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
    g.fillStyle = '#1f4a34'; g.fillRect(0, 0, W, H);
    if (groundLayer) g.drawImage(groundLayer, -cx, -cy);
    // water animation
    if (ok('terrain')) {
      const WF = [[3, 11], [3, 12], [0, 13], [1, 13]], f0 = Math.floor(T * 2.5);
      for (const [px, py, ph] of waterTiles) {
        if (px - cx < -16 || px - cx > W || py - cy < -16 || py - cy > H) continue;
        const src = WF[(f0 + ph) % 4];
        g.drawImage(IMG.terrain, src[0] * TS, src[1] * TS, TS, TS, px - cx, py - cy, TS, TS);
      }
    }
    // tap marker
    if (this.marker) frame(g, 'tap', 16, 16, Math.min(3, Math.floor(this.marker.t * 7)), 0, this.marker.x - 8 - cx, this.marker.y - 12 - cy);
    // y-sorted stuff
    const list = [];
    const vis = (x, y, w, hh) => x - cx < W + 8 && x + w - cx > -8 && y - cy < H + 8 && y + hh - cy > -8;
    for (const s of statics) {
      if (s.fountain) { if (vis(s.x, s.y, 64, 64)) list.push(s); continue; }
      if (vis(s.x, s.y, s.sw, s.sh)) list.push(s);
    }
    list.push({ base: this.her.y, her: true }, { base: this.him.y + 0.1, him: true });
    for (const c of this.cats) list.push({ base: c.y, cat: c });
    list.sort((a, b) => a.base - b.base);
    for (const s of list) {
      if (s.her) drawChar(g, 'her', this.her.x - cx, this.her.y - cy, this.her.dir, this.her.moving, this.her.t);
      else if (s.him) drawChar(g, 'him', this.him.x - cx, this.him.y - cy, this.him.dir, this.him.moving, this.him.t);
      else if (s.cat) drawCat(g, s.cat.idx, s.cat.x - cx, s.cat.y - cy, s.cat.mode, s.cat.t, s.cat.flip);
      else if (s.fountain) frame(g, 'fountain', 64, 64, Math.floor(T * 6) % 4, 0, s.x - cx, s.y - cy);
      else if (ok(s.key)) g.drawImage(IMG[s.key], s.sx, s.sy, s.sw, s.sh, Math.round(s.x - cx), Math.round(s.y - cy), s.sw, s.sh);
      else placeholder(g, s.x - cx, s.y - cy, s.sw, s.sh, s.building ? 'rgba(194,138,88,.85)' : 'rgba(46,107,62,.8)');
    }
    // lamp glow at night-ish evening feel (subtle)
    for (const s of list) if (s.lamp) glow(g, s.x + 8 - cx + 4, s.y + 6 - cy, 14, '#f8c070', 0.18);
    // markers over places
    for (const b of BUILDINGS) {
      if (!b.date) continue;
      const mx = b.doorX * TS + 8 - cx - 8, my = b.y - 14 - cy + Math.round(Math.sin(T * 3 + b.tx) * 1.5);
      if (mx < -16 || mx > W || my < -16 || my > H) continue;
      drawIcon(g, save.done[b.date] ? ICON.markerDone : ICON.markerNew, mx, my);
    }
    if (doneCount() >= C.dates.length) {
      const fx = FOUNTAIN.cx - cx, fy = FOUNTAIN.y - cy;
      glow(g, fx, fy + 36, 46, '#f0c040', 0.25 + Math.sin(T * 3) * 0.08);
      drawIcon(g, ICON.heart, fx - 8, fy - 12 + Math.round(Math.sin(T * 3) * 2));
    }
    drawParticles(g, cx, cy);
  },
};

async function petCat(c) {
  c.happy = 2.2; c.hold = 0;
  SFX.meow(); setTimeout(() => SFX.purr(), 250);
  burst(c.x, c.y - 14, 'heart', 5);
  const first = !save.cats[c.cat.name];
  save.cats[c.cat.name] = (save.cats[c.cat.name] || 0) + 1;
  track('cat', { name: c.cat.name });
  updateHud();
  await say(null, c.cat.name + ': ' + c.cat.say, '');
  if (first && catCount() === C.cats.length && !save.allCats) {
    save.allCats = true; persist();
    SFX.win();
    await say('me:happy', 'you pet all ' + C.cats.length + ' cats. obviously. i expected nothing less');
    await say('me:tease', 'official title unlocked: cat whisperer');
  } else if (first && catCount() === 1) {
    await say('me:happy', 'there are ' + (C.cats.length - 1) + ' more cats around town btw. go find them');
  }
  hideDlg();
}

async function fountain() {
  const n = doneCount();
  if (n < C.dates.length) {
    await talk([
      ['me', 'the fountain is just sparkling rn'],
      ['me', 'check out all the date spots first. ' + (C.dates.length - n) + ' left. the yellow ! bubbles show which ones'],
    ]);
    return;
  }
  await startFinal();
}
