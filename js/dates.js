'use strict';
// a date = scene backdrop + intro talk + mini game + outro talk + memory card

const dateById = (id) => C.dates.find((d) => d.id === id);
const DATE_ICON_IDX = { ceramics: 0, mosaic: 1, beads: 2, cinema: 3, flea: 4, ikea: 5, cabin: 6, custom: 7 };
const SCENE_MUSIC = { cabin: 'night', mosaic: 'night', cinema: 'night' };
// where the two stand (or sit) in each scene: [x, feetY, dir or 'sit']
const SCENE_SPOTS = {
  ikea: { her: [227, 182, 'sit'], him: [253, 182, 'sit'] }, // on the green sofa
  cabin: { her: [227, 197, 'sit'], him: [253, 197, 'sit'] }, // on the log by the fire
  final: { her: [229, 197, 'sit'], him: [253, 197, 'sit'] }, // on the fountain rim
  default: { her: [222, 206, 'right'], him: [256, 206, 'left'] },
};
function drawPair(g, id, ox, oy, t) {
  const s = SCENE_SPOTS[id] || SCENE_SPOTS.default;
  for (const who of ['her', 'him']) {
    const [x, y, d] = s[who];
    if (d === 'sit') drawChar(g, who, x - ox, y - oy, 'down', false, t + (who === 'him' ? 1.3 : 0), 'sit');
    else drawChar(g, who, x - ox, y - oy, d, false, t + (who === 'him' ? 0.4 : 0));
  }
  if (t % 5 < 2.5) g.drawImage(HEART_SPR, 239 - ox - 3, s.her[1] - 46 - oy + Math.round(Math.sin(t * 3) * 2));
}

// where the camera sits on a 480x270 scene so the characters stand above the dialogue box
function sceneView() {
  const ox = Math.round((480 - W) / 2);
  let oy = 206 - (H - 76);
  oy = H >= 270 ? -Math.round((H - 270) / 2) : clamp(oy, 0, 270 - H);
  return { ox, oy };
}

function dateScene(d) {
  return {
    t: 0,
    enter() { playMusic(SCENE_MUSIC[d.id] || 'town'); showHud(false); $('#label').classList.add('hidden'); },
    update(dt) { this.t += dt; updateParticles(dt); },
    draw() {
      const g = ctx, { ox, oy } = sceneView();
      g.fillStyle = '#1b1424'; g.fillRect(0, 0, W, H);
      if (ok('s_' + d.id)) g.drawImage(IMG['s_' + d.id], -ox, -oy);
      else placeholder(g, -ox, -oy, 480, 270, '#3d3550');
      if (d.id === 'cabin') {
        frame(g, 'm_campfire', 32, 32, Math.floor(this.t * 8) % 4, 0, 150 - ox - 16, 216 - oy - 31);
        glow(g, 150 - ox, 206 - oy, 46, '#f0944a', 0.28 + Math.sin(this.t * 9) * 0.04);
      }
      drawPair(g, d.id, ox, oy, this.t);
      drawParticles(g);
    },
  };
}

function memoryCard(d, result) {
  return new Promise((res) => {
    SFX.heart();
    const link = d.link ? `<p class="small"><a href="${d.link}" target="_blank" rel="noopener">${d.link.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a></p>` : '';
    const card = showPanel(`
      <div class="cols">
        <div class="col-art" id="mem-art"></div>
        <div>
          <canvas class="stamp" id="mem-stamp" width="96" height="32"></canvas>
          <h2>${d.title}</h2>
          <p>${d.card}</p>
          <p class="small">📍 ${d.place}</p>
          ${link}
          <button class="pbtn green" id="card-ok">nice, next →</button>
        </div>
      </div>`);
    const st = card.querySelector('#mem-stamp').getContext('2d');
    if (ok('stamp')) st.drawImage(IMG.stamp, 0, 0);
    const art = card.querySelector('#mem-art');
    if (result && result.canvas) art.appendChild(artCanvas(result.canvas, 96));
    else {
      const [c, g] = makeCanvas(32, 32);
      frame(g, 'dateIcons', 32, 32, DATE_ICON_IDX[d.id], 0, 0, 0);
      art.appendChild(artCanvas(c, 64));
    }
    const done = () => { uiStack.pop(); hidePanel(); SFX.select(); res(); };
    card.querySelector('#card-ok').addEventListener('click', done);
    uiStack.push({ onA: done, tapAdvance: false });
  });
}

// one line per mini game for the tracker in the email
function resultText(game, r) {
  if (!r) return 'played it';
  switch (game) {
    case 'mug': return 'painted her own mug';
    case 'lamp': return `made a mosaic lamp (${r.mine} pieces placed by her${r.auto ? `, ${r.auto} auto-filled` : ''})`;
    case 'beads': return `caught ${r.score} beads for her bracelet`;
    case 'popcorn': return `caught ${r.score} popcorn${r.spoilers ? `, got hit by ${r.spoilers} spoiler${r.spoilers > 1 ? 's' : ''}` : ', zero spoilers'}`;
    case 'find': return `found all 5 flea market items in ${r.time}s`;
    case 'fleaquest': return `found finn's hat + golden sword (${r.order}), beat the junk golem in ${r.time}s · got hit ${r.hits}x, ${r.slashes} sword swings, jake punch ${r.punches}x${r.saves ? `, jake had to save her ${r.saves}x lol` : ''}`;
    case 'maze': return `got through the ikea maze in ${r.time}s`;
    case 'fireflies': return `caught ${r.jar} fireflies in ${r.time}s`;
    default: return 'played it';
  }
}

async function enterDate(id) {
  const d = dateById(id);
  if (!d) return;
  const b = BUILDINGS.find((x) => x.date === id);
  const t0 = Date.now();
  window.curDate = id;
  world.frozen = true;
  await fadeOut(4);
  const ds = dateScene(d);
  setScene(ds);
  await fadeIn(4);
  if (save.done[id]) await talk([['me:happy', 'back here again? ok let\'s do it one more time']]);
  await talk(d.intro);
  await fadeOut(5);
  const result = await runMini(MINIGAMES[d.game]());
  if (d.game === 'fleaquest' && result) { save.hat = true; persist(); } // she keeps finn's hat, but only once the fight is won
  await fadeOut(5);
  setScene(ds);
  await fadeIn(5);
  if (result && result.img) save.souvenirs[id] = result.img;
  await talk(d.outro);
  await memoryCard(d, result);
  const first = !save.done[id];
  save.done[id] = true;
  track('date', { id, result: resultText(d.game, result), replay: !first, secs: Math.round((Date.now() - t0) / 1000) });
  window.curDate = null;
  await fadeOut(4);
  setScene(world);
  world.placeAt(b.doorX, b.doorY, 'down');
  world.frozen = false;
  await fadeIn(4);
  if (first) {
    const n = doneCount();
    updateHud();
    toast('memories ' + n + '/' + C.dates.length);
    if (n === C.dates.length) {
      SFX.win();
      await talk([
        ['me:happy', 'ok that was all 7'],
        ['me', 'you saw everything. now the important part'],
        ['me:love', 'meet me at the fountain in the middle of town ♥'],
      ]);
    } else if (n === 1) {
      await talk([['me', 'one down, ' + (C.dates.length - 1) + ' to go. the yellow ! bubbles show where we haven\'t been yet']]);
    }
  }
}
