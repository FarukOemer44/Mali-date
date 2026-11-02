'use strict';
// title screen, intro, boot

const titleScene = {
  t: 0,
  enter() { showHud(false); $('#label').classList.add('hidden'); this.place(); },
  resize() { this.place(); },
  place() { $('#menu').style.top = Math.min(H - 64, 104) * S + 'px'; },
  update(dt) { this.t += dt; updateParticles(dt); if (Math.random() < dt * 0.8) burst(rnd(W * 0.2, W * 0.8), rnd(H * 0.55, H * 0.8), 'heart', 1); },
  draw() {
    const g = ctx, t = this.t;
    g.fillStyle = '#1b1424'; g.fillRect(0, 0, W, H);
    const ox = Math.round((480 - W) / 2), oy = H >= 270 ? -Math.round((H - 270) / 2) : clamp(Math.round((270 - H) * 0.55), 0, 270 - H);
    if (ok('s_title')) g.drawImage(IMG.s_title, -ox, -oy); else placeholder(g, 0, 0, W, H, '#3e2866');
    const bob = Math.round(Math.sin(t * 2) * 2);
    if (ok('logo')) g.drawImage(IMG.logo, Math.round(W / 2 - 128), 4 + bob);
    const fy = H - 10;
    drawCat(g, 0, W / 2 - 46, fy, Math.floor(t) % 6 === 0 ? 'happy' : 'sit', t);
    drawChar(g, 'her', W / 2 - 14, fy, 'down', false, t);
    drawChar(g, 'him', W / 2 + 14, fy, 'down', false, t + 0.3);
    drawCat(g, 1, W / 2 + 46, fy, 'sit', t + 2, true);
    drawParticles(g);
  },
};

function showMenu() {
  $('#menu').classList.remove('hidden');
  $('#btn-continue').classList.toggle('hidden', !save.intro);
  $('#btn-new').textContent = save.intro ? 'new game' : 'start';
  $('#btn-new').classList.toggle('green', !save.intro);
}
let menuBusy = false;
$('#menu').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || menuBusy) return;
  menuBusy = true;
  audioUnlock();
  SFX.select();
  $('#menu').classList.add('hidden');
  // in-game confirm (browser confirm() popups get blocked in some in-app browsers)
  if (b.dataset.act === 'new' && save.intro) {
    const r = await ask(null, 'start a new game? all progress gets reset', ['yes, start over', 'no, go back'], { name: '', track: false });
    hideDlg();
    if (r !== 0) { showMenu(); menuBusy = false; return; }
  }
  menuBusy = false;
  if (b.dataset.act === 'new') {
    resetSave();
    save.startedAt = Date.now();
    track('start');
    await startIntro();
  }
  else {
    await fadeOut(4);
    setScene(world);
    world.placeAt(26, 22);
    await fadeIn(4);
  }
});

async function startIntro() {
  await fadeOut(4);
  setScene(world);
  world.placeAt(26, 22, 'down');
  world.frozen = true;
  playMusic('town');
  await fadeIn(3);
  await say('me:happy', 'hey ' + C.herName + ' :)');
  await say('me', 'so... i kinda made you a little game');
  await say('me', 'because i wanna take you on a date but i couldn\'t decide what we should do');
  const r = await ask('me:love', 'will you go on a date with me?', ['yes ♥', 'no'], { runaway: 1 });
  if (r === 1) await say('me:tease', 'haha i knew the button would give up eventually');
  else await say('me:happy', 'ok perfect, that was the only right answer anyway');
  SFX.heart();
  burst(world.her.x, world.her.y - 40, 'heart', 10);
  await say('me', 'here\'s the deal: there are 7 date spots in this town');
  await say('me', 'we do a little test run of every single one together');
  await say('me:love', 'once you\'ve seen all 7, meet me at the fountain in the middle of town');
  await say('me:happy', 'there you pick the one we actually do, and the day. that\'s the end of the game');
  await say('me', 'your quest is always up in the top right corner, so you know what\'s next');
  await say('me:tease', 'oh and there are some cats walking around. go pet them, obviously');
  await say(null, isTouch ? 'tap anywhere to walk there. tap a place to go inside, tap a cat to pet it.' : 'click anywhere to walk there (or use the arrow keys). click a place to go inside, click a cat to pet it.', '');
  hideDlg();
  save.intro = true;
  track('intro_done');
  world.frozen = false;
  updateHud();
  $('#quest').classList.add('open');
  setTimeout(() => $('#quest').classList.remove('open'), 6000);
  toast('find all 7 date spots!');
}

// rotate-your-phone animation
setInterval(() => {
  if ($('#rotate').classList.contains('hidden')) return;
  const c = $('#rotate-c'), g = c.getContext('2d');
  g.imageSmoothingEnabled = false; g.clearRect(0, 0, 64, 64);
  if (ok('rotate')) g.drawImage(IMG.rotate, (Math.floor(Date.now() / 700) % 2) * 64, 0, 64, 64, 0, 0, 64, 64);
}, 200);

// ---------- boot ----------
(async function boot() {
  layout();
  await loadAssets((p) => { $('#load-fill').style.width = Math.round(p * 100) + '%'; });
  try { await document.fonts.ready; } catch (e) {}
  setMuted(muted);
  if (save.hat && !save.done.flea) save.hat = false; // the hat only counts once the flea market fight is won
  save.sessions = (save.sessions || 0) + 1; persist();
  document.querySelectorAll('canvas[data-icon]').forEach((c) => paintIcon(c, 'icons', +c.dataset.icon));
  world.init();
  layout();
  setScene(titleScene);
  $('#loading').classList.add('hidden');
  requestAnimationFrame(loop);
  showMenu();
  fadeIn(2);
})();
