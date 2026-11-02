'use strict';
// flea market adventure: walk the street, search stalls, find finn's hat + golden sword,
// transform (she becomes finn, he becomes jake), ride in like the show and beat the junk golem

const fightPad = Object.assign(document.createElement('div'), { id: 'fightpad', className: 'hidden' });
const splashText = Object.assign(document.createElement('div'), { id: 'splash', className: 'hidden', textContent: 'it\'s adventure time!' });
document.getElementById('stage').append(fightPad, splashText);

function fleaQuestGame() {
  const GROUND = 214, AGROUND = 222, STREET_W = 960;
  const STALLS = [
    { x: 120, lines: [['me:happy', 'a vinyl of old love songs. we\'re buying it, no discussion'], ['me', 'wait... jjk volume 0. ok we\'re buying this too']] },
    { x: 270, lines: [['me:tease', 'so many hats. none of them is THE hat though'], ['me', 'this jacket would look so good on you. noted']] },
    { x: 420, lines: [['me:happy', 'a lamp shaped like a cat. 4 euro. tempting'], ['me', 'a teapot with a tiny frog on the lid. iconic']] },
    { x: 570, lines: [['me:tease', 'a plushie that looks exactly like gojo. it\'s staring at me'], ['me', 'a box of old game cartridges. we\'re coming back for these']] },
    { x: 720, lines: [['me', 'an old typewriter. very main character energy'], ['me:tease', 'a suit of armour. a little too big for you']] },
    { x: 860, lines: [['me', 'a mysterious key. it doesn\'t open anything. we take it anyway'], ['me:tease', 'a "cursed" finger. we are NOT buying that']] },
  ];
  const hatAt = pick([1, 3]), swordAt = pick([4, 5]);
  const her = { x: 60, dir: 'right', moving: false, t: 0, target: null };
  const him = { x: 36, dir: 'right', moving: false, t: 0 };
  const searched = {}, found = { hat: false, sword: false }, order = [];
  let mode = 'explore', busy = false, camX = 0, camLock = null, shake = 0, poofs = [], pickupFx = null, rise = -1;
  let hero = false, buddy = false, F = null, result = null, splashT = -1;
  const streaks = Array.from({ length: 26 }, () => ({ y: rnd(0, 1), x: rnd(0, 1), len: rnd(20, 70), sp: rnd(500, 900), c: pick(['#fff7e6', '#f8e070', '#fbfaff', '#f8c070']) }));

  // ---------- helpers ----------
  const drawF = (g, key, col, row, x, y, flip = false) => frame(g, key, 48, 48, col, row, x - 24, y - 46, flip);
  const camY = (ground) => (H >= 270 ? -Math.round((H - 270) / 2) : clamp(ground - (H - 34), 0, 270 - H));
  function addPoof(x, y) { poofs.push({ x, y, t: 0 }); SFX.pop(); setTimeout(() => SFX.heart(), 80); }
  function hud() {
    const icon = (i, got) => `<span class="find ${got ? 'got-on' : ''}"><canvas data-pick="${i}" width="24" height="24"></canvas></span>`;
    if (mode !== 'explore') { miniHud.classList.add('hidden'); return; }
    setHud(`find: ${icon(0, found.hat)} ${icon(1, found.sword)}`);
    miniHud.querySelectorAll('canvas[data-pick]').forEach((c) => paintIcon(c, 'f_pickups', +c.dataset.pick, 24));
  }

  // ---------- explore ----------
  async function searchStall(i) {
    busy = true;
    her.dir = 'up';
    SFX.select();
    const s = STALLS[i];
    searched[i] = (searched[i] || 0) + 1;
    if (i === hatAt && !found.hat) {
      found.hat = true; order.push('hat');
      pickupFx = { k: 0, x: her.x, t: 0 }; SFX.win();
      await talk([[null, 'under a pile of scarves: a white hat with two little bear ears...', ''], ['me:love', 'wait. is that... FINN\'S HAT??'], ['me:happy', 'you HAVE to take it']]);
      toast('found: finn\'s hat!');
    } else if (i === swordAt && !found.sword) {
      found.sword = true; order.push('sword');
      pickupFx = { k: 1, x: her.x, t: 0 }; SFX.win();
      await talk([[null, 'between old umbrellas, something golden is glowing...', ''], ['me:tease', 'ok that is NOT a normal flea market sword'], ['me:happy', 'finn\'s golden sword. 2 euro. deal of the century']]);
      toast('found: finn\'s golden sword!');
    } else {
      const l = s.lines[(searched[i] - 1) % s.lines.length];
      await talk([searched[i] > 2 ? ['me', 'nothing new here. next stall?'] : l]);
    }
    track('stall', { i });
    hud();
    if (found.hat && found.sword) await transform();
    else busy = false;
  }

  async function transform() {
    mode = 'cut';
    hud();
    await talk([['me:happy', 'ok you have the hat AND the sword'], ['me:love', 'put it on. put it on put it on']]);
    addPoof(her.x, GROUND - 16); await sleep(250); hero = true; her.dir = 'right';
    await sleep(500);
    await talk([['me:love', 'MATHEMATICAL!! you\'re literally finn now'], ['me:happy', 'and finn needs jake. obviously that\'s me']]);
    addPoof(him.x, GROUND - 12); await sleep(250); buddy = true;
    await sleep(600);
    // something stirs in the junk pile
    camLock = STREET_W - W;
    shake = 6; SFX.bad();
    await sleep(700);
    rise = 0;
    for (let i = 0; i < 3; i++) { shake = 5; tone(70, 0.3, 'sawtooth', 0.12); await sleep(450); }
    await talk([[null, 'WHO DARES TOUCH MY TREASURES', 'junk golem'], ['me:tease', 'uh oh. ok finn, you know what to do. hop on']]);
    // fighting-game style cut-in: the two of them in the classic riding pose
    mode = 'splash'; splashT = 0;
    SFX.win(); setTimeout(() => SFX.heart(), 350);
    setTimeout(() => { splashText.classList.remove('hidden'); splashText.style.animation = 'none'; void splashText.offsetWidth; splashText.style.animation = ''; }, 350);
    await sleep(2400);
    splashText.classList.add('hidden');
    await fadeOut(4);
    startFight();
    await fadeIn(4);
  }
  function drawSplash(g) {
    const t = splashT;
    g.fillStyle = '#24163e'; g.fillRect(0, 0, W, H);
    // diagonal band + speed streaks
    g.fillStyle = '#3e2866'; g.beginPath(); g.moveTo(0, H * 0.18); g.lineTo(W, H * 0.06); g.lineTo(W, H * 0.86); g.lineTo(0, H * 0.98); g.fill();
    for (const s of streaks) {
      const x = W - ((s.x * W + t * s.sp) % (W + s.len)), y = Math.round(H * 0.1 + s.y * H * 0.8);
      g.globalAlpha = 0.55; R(g, x, y, s.len, 1, s.c); g.globalAlpha = 1;
    }
    glow(g, W / 2, H / 2, 120, '#f8c070', 0.25);
    const slide = Math.min(1, t / 0.25), bob = Math.round(Math.sin(t * 14) * 2);
    const bx = Math.round(lerp(-200, W / 2 - 96, 1 - Math.pow(1 - slide, 3))), by = Math.round(H / 2 - 80 + bob);
    if (ok('f_ride_big')) {
      const frames = IMG.f_ride_big.width >= 384 ? 2 : 1;
      g.drawImage(IMG.f_ride_big, (Math.floor(t * 8) % frames) * 192, 0, 192, 144, bx, by, 192, 144);
    } else frame(g, 'f_ride', 80, 64, Math.floor(t * 10) % 4, 0, bx + 56, by + 60);
    if (t < 0.12) { g.fillStyle = `rgba(255,247,230,${0.8 - t * 6})`; g.fillRect(0, 0, W, H); } // flash
  }

  // ---------- fight ----------
  function startFight() {
    mode = 'fight';
    camLock = null;
    F = {
      p: { x: 150, y: AGROUND, vx: 0, vy: 0, ground: true, face: 1, hp: 10, inv: 0, state: 'idle', st: 0, t: 0, hitDone: false },
      b: { x: 118, y: AGROUND, face: 1, t: 0, punch: -1, cd: 2, arm: 0, hitDone: false, hop: 0 },
      g: { x: 360, y: AGROUND, oy: 0, face: -1, hp: 170, max: 170, state: 'idle', st: 0, t: 0, timer: 1.6, flash: 0, stun: 0, hitDone: false, dead: -1 },
      shots: [], waves: [], fx: [], banner: { i: 0, t: 0 }, time: 0, hits: 0, punches: 0, saves: 0, slashes: 0, btn: {}, over: -1,
      intro: 0, rideX: -60, // they gallop in riding jake before the fight starts
    };
    buildPad();
    playMusic('game');
  }
  function buildPad() {
    fightPad.innerHTML = '';
    const mk = (cls, idx, onDown, onUp) => {
      const b = document.createElement('div'); b.className = 'fbtn ' + cls;
      const c = document.createElement('canvas'); c.width = 32; c.height = 32; b.appendChild(c);
      paintIcon(c, 'f_buttons', idx, 32);
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); audioUnlock(); b.classList.add('on'); onDown(); try { b.setPointerCapture(e.pointerId); } catch (er) {} });
      const up = () => { b.classList.remove('on'); if (onUp) onUp(); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
      fightPad.appendChild(b);
      return b;
    };
    mk('left', 0, () => { F.btn.left = 1; }, () => { F.btn.left = 0; });
    mk('right', 1, () => { F.btn.right = 1; }, () => { F.btn.right = 0; });
    mk('jump', 2, () => { F.btn.jump = 1; });
    mk('sword', 3, () => { F.btn.slash = 1; });
    F.buddyBtn = mk('buddy', 4, () => { F.btn.buddy = 1; });
    fightPad.classList.remove('hidden');
  }
  function addFx(kind, x, y, face = 1) { F.fx.push({ kind, x, y, t: 0, face }); }
  // slash frames: wind-up, swing (main hit), follow-through (weaker hit), recover
  const slashFrame = (t) => (t < 0.08 ? 0 : t < 0.15 ? 1 : t < 0.24 ? 2 : 3);
  // jake's stretchy arm starts at the frame edge (+24 from his anchor) and reaches the golem's front
  const armReach = (B, G) => clamp(Math.abs(G.x - B.x) - 44, 8, 300);
  // fx.png: slash pivots at (4,16) facing right, hit/stars centred, dust sits on its bottom row
  function drawFxSprite(g, f, X, Y) {
    const base = { slash: 0, hit: 3, dust: 6, star: 9 }[f.kind] || 0, col = base + Math.min(2, Math.floor(f.t / 0.1));
    if (f.kind === 'slash') frame(g, 'f_fx', 32, 32, col, 0, f.face > 0 ? X(f.x) - 4 : X(f.x) - 28, Y(f.y) - 16, f.face < 0);
    else if (f.kind === 'dust') frame(g, 'f_fx', 32, 32, col, 0, X(f.x) - 16, Y(f.y) - 31);
    else frame(g, 'f_fx', 32, 32, col, 0, X(f.x) - 16, Y(f.y) - 16);
  }
  function hurtPlayer(d, fromX) {
    const P = F.p;
    if (P.inv > 0 || F.over >= 0) return;
    P.hp -= d; F.hits++; P.inv = 1.1; P.state = 'hurt'; P.st = 0;
    P.x = clamp(P.x + (P.x < fromX ? -12 : 12), 40, 440);
    SFX.bad(); shake = 4;
    if (P.hp <= 0) {
      F.saves++; P.hp = 10; F.g.stun = 2.6; F.g.state = 'idle'; F.g.timer = 2.6;
      toast('jake to the rescue! ♥'); burst(P.x, P.y - 30, 'heart', 8); SFX.heart();
    }
  }
  function hurtGolem(d, fromX) {
    const G = F.g;
    if (G.hp <= 0) return;
    G.hp = Math.max(0, G.hp - d); G.flash = 0.25;
    G.x = clamp(G.x + (G.x > fromX ? 6 : -6), 60, 430);
    SFX.coin(); shake = Math.max(shake, 2);
    if (G.hp <= 0) {
      G.dead = 0; G.state = 'dead'; F.over = 0; F.shots = []; F.waves = [];
      F.banner = { i: 1, t: 0 }; SFX.win(); shake = 8;
      for (let i = 0; i < 8; i++) addFx('star', G.x + rnd(-30, 30), G.y - rnd(20, 70));
    }
  }
  function golemChoose() {
    const G = F.g, P = F.p, d = Math.abs(P.x - G.x), r = Math.random(), rage = G.hp < G.max * 0.4;
    G.st = 0; G.hitDone = false;
    if (d < 74) G.state = r < 0.62 ? 'swing' : 'stomp';
    else if (d > 150) G.state = r < 0.5 ? 'throw' : r < 0.72 ? 'stomp' : 'walk';
    else G.state = r < 0.55 ? 'walk' : r < 0.8 ? 'throw' : 'stomp';
    if (G.state === 'walk') G.timer = rage ? 1.4 : 2.0;
  }
  function updateFight(dt) {
    const P = F.p, B = F.b, G = F.g;
    for (const f of F.fx) f.t += dt;
    F.fx = F.fx.filter((f) => f.t < 0.36);
    if (F.intro >= 0) { // the ride-in
      F.intro += dt; G.t += dt;
      F.rideX = lerp(-60, 150, Math.min(1, F.intro / 1.3));
      if (F.intro < 1.3 && Math.floor(F.intro * 9) !== Math.floor((F.intro - dt) * 9)) { addFx('dust', F.rideX - 30, AGROUND); SFX.step(); }
      if (F.intro > 1.65) {
        poofs.push({ x: F.rideX, y: AGROUND - 18, t: 0 }); SFX.pop();
        P.x = F.rideX + 10; B.x = F.rideX - 22; P.face = 1; B.face = 1;
        F.intro = -1; F.banner = { i: 0, t: 0 }; shake = 3;
        setTimeout(() => SFX.win(), 150);
      }
      return;
    }
    F.time += dt; F.banner.t += dt;
    // ---- player ----
    const btn = F.btn;
    const jump = hit('up') || btn.jump; const slash = hit('a') || btn.slash; const special = hit('b') || btn.buddy;
    btn.jump = btn.slash = btn.buddy = 0;
    const playing = F.over < 0 && F.banner.t > (F.banner.i === 0 ? 0.6 : 0);
    let mv = playing ? (held('left') || btn.left ? -1 : 0) + (held('right') || btn.right ? 1 : 0) : 0;
    if (P.state === 'hurt') mv = 0;
    if (P.state === 'slash' && P.ground) mv *= 0.35;
    P.vx = mv * 100; if (mv && P.state !== 'slash') P.face = mv;
    if (playing && jump && P.ground && P.state !== 'hurt') { P.vy = -240; P.ground = false; tone(420, 0.12, 'square', 0.06, 0, null, 1.6); }
    P.vy += 640 * dt; P.x += P.vx * dt; P.y += P.vy * dt;
    if (P.y >= AGROUND) { if (!P.ground) addFx('dust', P.x, AGROUND); P.y = AGROUND; P.vy = 0; P.ground = true; }
    P.x = clamp(P.x, 40, 440);
    P.inv -= dt; P.t += dt;
    if (playing && slash && P.state !== 'slash' && P.state !== 'hurt') {
      P.state = 'slash'; P.st = 0; P.hitDone = false; F.slashes++; tone(900, 0.08, 'sawtooth', 0.05, 0, null, 0.4);
    }
    if (P.state === 'slash') {
      P.st += dt;
      const fr = slashFrame(P.st);
      // sword hitbox from the sprite: x +2..+30 in front of her, y -34..-2
      const sx0 = P.x + (P.face > 0 ? 2 : -30), sx1 = sx0 + 28, sy0 = P.y - 34, sy1 = P.y - 2;
      if (fr >= 1 && fr <= 2) {
        if (!P.hitDone && G.hp > 0 && sx1 > G.x - 22 && sx0 < G.x + 22 && sy1 > G.y + G.oy - 72 && sy0 < G.y + G.oy) {
          P.hitDone = true; hurtGolem(6, P.x); addFx('hit', (sx0 + sx1) / 2, P.y - 22);
        }
        for (const s of F.shots) if (!s.dead && s.x > sx0 - 6 && s.x < sx1 + 6 && s.y > sy0 - 6 && s.y < sy1 + 6) { s.dead = true; addFx('hit', s.x, s.y); SFX.pop(); }
      }
      if (P.st > 0.34) P.state = 'idle';
    } else if (P.state === 'hurt') { P.st += dt; if (P.st > 0.35) P.state = 'idle'; }
    // ---- buddy ----
    B.t += dt; B.cd -= dt;
    if (B.punch < 0) {
      const tx = P.x - P.face * 26;
      const d = tx - B.x;
      B.x += clamp(d, -120 * dt, 120 * dt);
      B.face = Math.abs(d) > 2 ? Math.sign(d) : P.face;
      B.hop = Math.abs(d) > 2 ? Math.abs(Math.sin(B.t * 12)) * 3 : 0;
      if (playing && special && B.cd <= 0) { B.punch = 0; B.cd = 6; B.hitDone = false; F.punches++; B.face = G.x > B.x ? 1 : -1; tone(300, 0.3, 'triangle', 0.1, 0, null, 2.5); }
    } else {
      B.punch += dt;
      const reach = armReach(B, G);
      if (B.punch < 0.15) B.arm = 0;
      else if (B.punch < 0.32) B.arm = reach * ((B.punch - 0.15) / 0.17);
      else if (B.punch < 0.44) { B.arm = reach; if (!B.hitDone) { B.hitDone = true; if (G.hp > 0 && Math.abs(G.y + G.oy - B.y) < 60) { hurtGolem(12, B.x); addFx('hit', B.x + B.face * (24 + reach + 8), B.y - 9); shake = 4; } } }
      else if (B.punch < 0.64) B.arm = reach * (1 - (B.punch - 0.44) / 0.2);
      else { B.punch = -1; B.arm = 0; }
    }
    if (F.buddyBtn) F.buddyBtn.style.setProperty('--cd', Math.max(0, B.cd / 6));
    // ---- golem ----
    G.t += dt; G.flash -= dt;
    if (G.dead >= 0) G.dead += dt;
    else if (playing) {
      if (G.state !== 'stomp') G.face = P.x < G.x ? -1 : 1;
      const rage = G.hp < G.max * 0.4, d = Math.abs(P.x - G.x);
      if (G.stun > 0) { G.stun -= dt; G.state = 'idle'; if (Math.random() < dt * 6) addFx('star', G.x + rnd(-16, 16), G.y - 78); }
      else if (G.state === 'idle') { G.timer -= dt; if (G.timer <= 0) golemChoose(); }
      else if (G.state === 'walk') {
        G.x += G.face * (rage ? 40 : 28) * dt; G.timer -= dt;
        if (d < 66) { G.state = 'swing'; G.st = 0; G.hitDone = false; }
        else if (G.timer <= 0) golemChoose();
      } else if (G.state === 'swing') {
        G.st += dt;
        const wind = rage ? 0.5 : 0.7;
        // umbrella impact lands 18-44 px in front of the golem
        if (G.st > wind && G.st < wind + 0.16 && !G.hitDone && d < 60 && (P.x - G.x) * G.face > -8 && P.y > G.y - 46) { G.hitDone = true; hurtPlayer(2, G.x); addFx('hit', P.x, P.y - 20); }
        if (G.st > wind + 0.6) { G.state = 'idle'; G.timer = rnd(0.5, 1.1) * (rage ? 0.7 : 1); }
      } else if (G.state === 'stomp') {
        G.st += dt;
        if (G.st > 0.45 && G.st < 0.85) G.oy = -Math.sin(((G.st - 0.45) / 0.4) * Math.PI) * 26; else G.oy = 0;
        if (G.st >= 0.85 && !G.hitDone) {
          G.hitDone = true; shake = 7; tone(60, 0.4, 'sawtooth', 0.15);
          F.waves.push({ x: G.x - 18, dir: -1, t: 0 }, { x: G.x + 18, dir: 1, t: 0 });
          addFx('dust', G.x - 20, AGROUND); addFx('dust', G.x + 20, AGROUND);
        }
        if (G.st > 1.35) { G.state = 'idle'; G.timer = rnd(0.6, 1.2) * (rage ? 0.7 : 1); }
      } else if (G.state === 'throw') {
        G.st += dt;
        if (G.st > 0.5 && !G.hitDone) {
          G.hitDone = true;
          const sx = G.x + G.face * 46, sy = G.y - 44, T0 = 0.95; // teapot spout
          F.shots.push({ x: sx, y: sy, vx: (P.x - sx) / T0, vy: -175, k: irnd(0, 5), t: 0 });
          if (rage) F.shots.push({ x: sx, y: sy, vx: (P.x - sx) / T0 * 0.6, vy: -230, k: irnd(0, 5), t: 0 });
          tone(240, 0.12, 'square', 0.06);
        }
        if (G.st > 0.95) { G.state = 'idle'; G.timer = rnd(0.7, 1.3); }
      }
      G.x = clamp(G.x, 60, 430);
    }
    // ---- projectiles + shockwaves ----
    for (const s of F.shots) {
      if (s.dead) continue;
      s.t += dt; s.vy += 380 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (Math.abs(s.x - P.x) < 10 && s.y > P.y - 34 && s.y < P.y) { s.dead = true; hurtPlayer(2, s.x); addFx('hit', s.x, s.y); }
      if (s.y >= AGROUND - 4) { s.dead = true; addFx('dust', s.x, AGROUND); }
    }
    F.shots = F.shots.filter((s) => !s.dead);
    for (const w of F.waves) {
      w.t += dt; w.x += w.dir * 150 * dt;
      if (P.ground && Math.abs(w.x - P.x) < 14) hurtPlayer(2, w.x - w.dir * 20);
    }
    F.waves = F.waves.filter((w) => w.x > 0 && w.x < 480 && w.t < 3);
    // ---- the end ----
    if (F.over >= 0) {
      F.over += dt;
      if (F.over > 1.6 && F.banner.i === 1) { F.banner = { i: 2, t: 0 }; SFX.heart(); burst(P.x, P.y - 40, 'heart', 10); }
      if (F.over > 3.6 && !result) {
        result = { order: order.join(' → '), time: Math.round(F.time), hits: F.hits, punches: F.punches, saves: F.saves, slashes: F.slashes };
        fightPad.classList.add('hidden'); fightPad.innerHTML = '';
        scene.finish(result);
      }
    }
  }
  function drawFight(g) {
    // keep the ground line above the touch buttons at the bottom
    const ox = Math.round((480 - W) / 2), oy = H >= 270 ? -Math.round((H - 270) / 2) : clamp(AGROUND - (H - 50), 0, 270 - H);
    const sx = shake > 0 ? Math.round(rnd(-shake, shake)) : 0;
    g.fillStyle = '#1b1424'; g.fillRect(0, 0, W, H);
    if (ok('f_arena')) g.drawImage(IMG.f_arena, -ox + sx, -oy); else placeholder(g, -ox, -oy, 480, 270, '#9c6440');
    const X = (x) => Math.round(x - ox + sx), Y = (y) => Math.round(y - oy);
    const P = F.p, B = F.b, G = F.g;
    for (const w of F.waves) frame(g, 'f_shock', 64, 16, Math.floor(w.t * 10) % 3, 0, X(w.x) - 32, Y(AGROUND) - 15, w.dir < 0);
    // golem
    ellipseShadow(g, X(G.x), Y(AGROUND), 26, 4, 0.3);
    let gc = 0, gr = 0;
    if (G.dead >= 0) { gr = 3; gc = G.dead > 0.5 ? 5 : 4; }
    else if (G.flash > 0) { gr = 3; gc = 2 + (Math.floor(G.flash * 20) % 2); }
    else if (G.state === 'walk') { gr = 1; gc = Math.floor(G.t * 6) % 4; }
    else if (G.state === 'swing') { gr = 2; const wind = G.hp < G.max * 0.4 ? 0.5 : 0.7; gc = G.st < wind * 0.5 ? 0 : G.st < wind ? 1 : G.st < wind + 0.16 ? 2 : 3; }
    else if (G.state === 'stomp') { gr = 3; gc = G.st < 0.85 ? 0 : 1; }
    else if (G.state === 'throw') { gr = 1; gc = G.st < 0.5 ? 4 : 5; }
    else { gr = 0; gc = Math.floor(G.t * 4) % 4; }
    if (!(G.flash > 0 && Math.floor(G.flash * 30) % 2)) frame(g, 'f_golem', 96, 96, gc, gr, X(G.x) - 48, Y(G.y + G.oy) - 94, G.face > 0);
    if (G.stun > 0) for (let i = 0; i < 3; i++) frame(g, 'f_fx', 32, 32, 9 + (Math.floor(G.t * 8 + i) % 3), 0, X(G.x + Math.cos(G.t * 4 + i * 2) * 14) - 16, Y(G.y - 86) - 16);
    for (const s of F.shots) frame(g, 'f_junk', 16, 16, s.k === 2 || s.k === 3 ? 2 + (Math.floor(s.t * 12) % 2) : s.k, 0, X(s.x) - 8, Y(s.y) - 8);
    if (F.intro >= 0) { // galloping in, finn riding jake
      ellipseShadow(g, X(F.rideX), Y(AGROUND), 22, 3, 0.3);
      frame(g, 'f_ride', 80, 64, Math.floor(F.intro * 12) % 4, 0, X(F.rideX) - 40, Y(AGROUND) - 62);
      for (const f of F.fx) drawFxSprite(g, f, X, Y);
      return;
    }
    for (const p of poofs) frame(g, 'f_poof', 32, 32, Math.min(4, Math.floor(p.t / 0.12)), 0, X(p.x) - 16, Y(p.y) - 16);
    // buddy (+ stretchy arm)
    ellipseShadow(g, X(B.x), Y(AGROUND), 9, 2, 0.28);
    let bc = 0, br = 0;
    if (B.punch >= 0) { br = 2; bc = B.punch < 0.08 ? 0 : B.punch < 0.15 ? 1 : B.punch < 0.5 ? 2 : 3; }
    else if (F.over >= 0) { br = 3; bc = 2 + (Math.floor(B.t * 5) % 2); }
    else if (B.hop) { br = 1; bc = Math.floor(B.t * 12) % 6; }
    else { br = 0; bc = Math.floor(B.t * 4) % 4; }
    drawF(g, 'f_buddy', bc, br, X(B.x), Y(B.y - B.hop), B.face < 0);
    if (B.arm > 2) {
      const ax = X(B.x + B.face * 24), ay = Y(B.y - B.hop - 13), L = Math.round(B.arm);
      for (let i = 0; i < L; i += 8) frame(g, 'f_arm', 8, 8, 0, 0, B.face > 0 ? ax + i : ax - i - 8, ay);
      frame(g, 'f_fist', 16, 16, 0, 0, B.face > 0 ? ax + L : ax - L - 16, ay - 4, B.face < 0);
    }
    // hero
    ellipseShadow(g, X(P.x), Y(AGROUND), 8, 2, 0.3);
    let pc = 0, pr = 0;
    if (F.over >= 0 && F.over > 1) { pr = 4; pc = 2 + (Math.floor(P.t * 4) % 2); }
    else if (P.state === 'hurt') { pr = 4; pc = Math.floor(P.st * 10) % 2; }
    else if (P.state === 'slash') { pr = 3; pc = slashFrame(P.st); }
    else if (!P.ground) { pr = 2; pc = P.vy < -60 ? 0 : P.vy < 60 ? 1 : 2; }
    else if (Math.abs(P.vx) > 1) { pr = 1; pc = Math.floor(P.t * 12) % 6; }
    else { pr = 0; pc = Math.floor(P.t * 4) % 4; }
    if (!(P.inv > 0 && P.state !== 'hurt' && Math.floor(P.inv * 16) % 2)) drawF(g, 'f_mali', pc, pr, X(P.x), Y(P.y), P.face < 0);
    // fx
    for (const f of F.fx) drawFxSprite(g, f, X, Y);
    drawParticles(g, ox - sx, oy);
    // ui: boss bar + hearts
    const bx = Math.round(W / 2 - 100), by = 6;
    if (ok('f_ui')) {
      g.drawImage(IMG.f_ui, 0, 0, 200, 14, bx, by, 200, 14);
      const fw = Math.round(183 * (G.hp / G.max));
      g.fillStyle = G.hp < G.max * 0.4 ? '#d84a52' : '#f0944a'; g.fillRect(bx + 14, by + 4, fw, 6);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(bx + 14, by + 4, fw, 1);
      for (let i = 0; i < 5; i++) { const v = P.hp - i * 2; g.drawImage(IMG.f_ui, (v >= 2 ? 0 : v === 1 ? 1 : 2) * 12, 16, 12, 12, 34 + i * 13, by + 1, 12, 12); }
    } else { R(g, bx, by, 200, 10, '#2d2236'); R(g, bx + 2, by + 2, 196 * G.hp / G.max, 6, '#f0944a'); for (let i = 0; i < 5; i++) R(g, 34 + i * 13, by, 10, 10, P.hp - i * 2 > 0 ? '#d84a52' : '#5b5470'); }
    // banner
    const bt = F.banner.t, show = F.banner.i === 0 ? bt < 1.3 : true;
    if (show && ok('f_banners')) {
      const s = bt < 0.15 ? 0.6 + bt / 0.15 * 0.4 : 1;
      const w = Math.round(160 * s), h = Math.round(40 * s);
      g.drawImage(IMG.f_banners, 0, F.banner.i * 40, 160, 40, Math.round(W / 2 - w / 2), Math.round(H * 0.3 - h / 2), w, h);
    }
  }

  // ---------- scene ----------
  const scene = {
    t: 0,
    dbg: () => ({ her, him, camX, mode, found, F, hatAt, swordAt, STALLS }), // for testing
    start() { hud(); playMusic('town'); },
    pointer(type, x, y) {
      if (mode !== 'explore' || busy || this.phase !== 'play' || type !== 'down') return;
      const wx = x + camX, wy = y + camY(GROUND);
      for (let i = 0; i < STALLS.length; i++) {
        if (Math.abs(wx - STALLS[i].x) < 50 && wy > 110 && wy < GROUND + 10) { her.target = { x: STALLS[i].x, stall: i }; SFX.tap(); return; }
      }
      her.target = { x: clamp(wx, 20, STREET_W - 70), stall: null };
      SFX.tap();
    },
    update(dt) {
      this.t += dt; updateParticles(dt);
      shake = Math.max(0, shake - dt * 18);
      for (const p of poofs) p.t += dt;
      poofs = poofs.filter((p) => p.t < 0.6);
      if (pickupFx) { pickupFx.t += dt; if (pickupFx.t > 2.2) pickupFx = null; }
      if (rise >= 0 && rise < 1) rise = Math.min(1, rise + dt * 0.7);
      if (splashT >= 0) splashT += dt;
      if (mode === 'fight') { if (this.phase === 'play') updateFight(dt); return; }
      // explore movement
      const sp = 72;
      let moved = 0;
      if (mode === 'explore' && !busy && this.phase === 'play') {
        const kv = (held('left') ? -1 : 0) + (held('right') ? 1 : 0);
        if (kv) { her.target = null; moved = kv * sp * dt; }
        else if (her.target) {
          const d = her.target.x - her.x;
          if (Math.abs(d) <= sp * dt) {
            moved = d; const st = her.target.stall; her.target = null;
            if (st != null) { her.x += moved; moved = 0; searchStall(st); }
          } else moved = Math.sign(d) * sp * dt;
        }
        if (hit('a')) { const near = STALLS.findIndex((s) => Math.abs(s.x - her.x) < 30); if (near >= 0) searchStall(near); }
      }
      her.x = clamp(her.x + moved, 20, STREET_W - 70);
      her.moving = Math.abs(moved) > 0.01;
      if (her.moving) { her.dir = moved < 0 ? 'left' : 'right'; her.t += dt; }
      const ht = her.x - (her.dir === 'left' ? -24 : 24);
      const hd = ht - him.x;
      him.moving = Math.abs(hd) > 1.5 && (her.moving || Math.abs(hd) > 6);
      if (him.moving) { him.x += clamp(hd, -sp * 1.1 * dt, sp * 1.1 * dt); him.dir = hd < 0 ? 'left' : 'right'; him.t += dt; }
      else if (!busy) him.dir = her.x < him.x ? 'left' : 'right';
      const target = camLock != null ? camLock : clamp(her.x - W / 2, 0, STREET_W - W);
      camX += (target - camX) * Math.min(1, dt * (camLock != null ? 2 : 6));
    },
    draw() {
      const g = ctx;
      if (mode === 'fight') { drawFight(g); return; }
      if (mode === 'splash') { drawSplash(g); return; }
      const oy = camY(GROUND), sx = shake > 0 ? Math.round(rnd(-shake, shake)) : 0;
      const cx = Math.round(camX) - sx;
      g.fillStyle = '#1b1424'; g.fillRect(0, 0, W, H);
      if (ok('f_street')) g.drawImage(IMG.f_street, -cx, -oy);
      else { if (ok('s_flea')) { g.drawImage(IMG.s_flea, -cx, -oy); g.drawImage(IMG.s_flea, 480 - cx, -oy); } }
      // stall markers
      if (mode === 'explore') STALLS.forEach((s, i) => {
        const mx = s.x - cx - 8, my = 128 - oy + Math.round(Math.sin(this.t * 3 + i) * 1.5);
        if (mx < -16 || mx > W) return;
        if (!searched[i]) drawIcon(g, ICON.markerNew, mx, my);
      });
      // the golem rising from the junk pile
      if (rise >= 0) {
        const gy = GROUND + Math.round((1 - rise) * 60);
        g.save(); g.beginPath(); g.rect(0, 0, W, GROUND - oy + 4); g.clip();
        frame(g, 'f_golem', 96, 96, rise < 0.5 ? 4 : 5, 0, 920 - cx - 48, gy - oy - 94);
        g.restore();
      }
      // characters (side view)
      const by = GROUND - oy;
      if (buddy) { ellipseShadow(g, him.x - cx, by, 9, 2, 0.28); drawF(g, 'f_buddy', him.moving ? Math.floor(him.t * 12) % 6 : Math.floor(this.t * 4) % 4, him.moving ? 1 : 0, him.x - cx, by, him.dir === 'left'); }
      else drawChar(g, 'him', him.x - cx, by, him.dir, him.moving, him.t);
      if (hero) { ellipseShadow(g, her.x - cx, by, 8, 2, 0.3); drawF(g, 'f_mali', her.moving ? Math.floor(her.t * 12) % 6 : Math.floor(this.t * 4) % 4, her.moving ? 1 : 0, her.x - cx, by, her.dir === 'left'); }
      else drawChar(g, 'her', her.x - cx, by, her.dir, her.moving, her.t);
      if (pickupFx) {
        const p = pickupFx, yy = by - 52 - Math.min(14, p.t * 30);
        glow(g, p.x - cx, yy + 12, 22, '#fff6b8', 0.45);
        frame(g, 'f_pickups', 24, 24, p.k, 0, p.x - cx - 12, yy);
      }
      for (const p of poofs) frame(g, 'f_poof', 32, 32, Math.min(4, Math.floor(p.t / 0.12)), 0, p.x - cx - 16, p.y - oy - 16);
      drawParticles(g, cx, oy);
    },
  };
  return {
    title: 'flea market quest',
    help: ['walk along the market and tap the stalls to search them.', 'rumour says something legendary is hidden here...'],
    scene,
    end: (r) => {
      const [c, g] = makeCanvas(96, 56);
      drawF(g, 'f_mali', 2, 4, 36, 52);
      drawF(g, 'f_buddy', 2, 3, 66, 52);
      return { title: 'junk golem defeated!', lines: [`you beat him in ${r.time} seconds${r.saves ? ' (with a little help from jake)' : ''}.`, 'finn and jake would be proud. the market is safe again'], art: artCanvas(c, 96) };
    },
  };
}
MINIGAMES.fleaquest = fleaQuestGame;
