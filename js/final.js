'use strict';
// the finale: pick the date, pick the day, send it (email via web3forms)

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (d) => `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const ymd = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const SLOTS = {
  normal: [
    { id: 'morning', label: 'morning', from: '10', to: '13' },
    { id: 'afternoon', label: 'afternoon', from: '14', to: '18' },
    { id: 'evening', label: 'evening', from: '19', to: '23' },
    { id: 'any', label: 'you decide', from: null },
  ],
  cabin: [
    { id: '2n', label: '2 nights', days: 2 },
    { id: '1n', label: '1 night', days: 1 },
    { id: 'day', label: 'just a day trip', days: 0 },
  ],
};

const fin = { step: 'choose', choice: null, custom: '', date: null, slot: null, note: '', month: null };

// night scene at the fountain while she picks
const finalScene = {
  t: 0,
  enter() { playMusic('night'); showHud(false); $('#label').classList.add('hidden'); },
  update(dt) { this.t += dt; updateParticles(dt); },
  draw() {
    const g = ctx, { ox, oy } = sceneView();
    g.fillStyle = '#1b1424'; g.fillRect(0, 0, W, H);
    if (ok('s_final')) g.drawImage(IMG.s_final, -ox, -oy); else placeholder(g, -ox, -oy, 480, 270, '#24163e');
    drawPair(g, 'final', ox, oy, this.t);
    for (let i = 0; i < 8; i++) { const a = this.t * 0.6 + i * 0.8; glow(g, W / 2 + Math.cos(a * 1.3 + i) * (80 + i * 12), H / 2 - 30 + Math.sin(a + i) * 30, 6, '#d0ec8a', 0.35 + Math.sin(this.t * 3 + i) * 0.2); }
    drawParticles(g);
  },
};

async function startFinal() {
  world.frozen = true;
  await fadeOut(3);
  setScene(finalScene);
  await fadeIn(3);
  if (save.submitted) {
    await talk([['me:happy', 'you already picked one :) here\'s your ticket']]);
    showTicket(save.submitted, true);
    return;
  }
  await talk([
    ['me', 'so...'],
    ['me', 'you went through all of them. ceramics, lamps, beads, cinema, flea market, ikea, the cabin'],
    ['me:love', 'now you get to choose which one we actually do for real'],
    ['me', 'or if you have a better idea you can just type it in. no pressure at all'],
  ]);
  const now = new Date();
  Object.assign(fin, { step: 'choose', choice: null, custom: '', date: null, slot: null, note: '', month: new Date(now.getFullYear(), now.getMonth(), 1) });
  renderFinal();
}

function choiceTitle() {
  if (fin.choice === 'custom') return fin.custom.trim() || 'my own idea';
  const d = dateById(fin.choice);
  return d ? d.title : '';
}

function renderFinal() {
  uiStack.length = 0;
  uiStack.push({ tapAdvance: false }); // block other input while the panel is open
  if (fin.step === 'choose') renderChoose();
  else if (fin.step === 'when') renderWhen();
  else if (fin.step === 'note') renderNote();
}

function renderChoose() {
  const opt = (id, title) => `<button class="opt${fin.choice === id ? ' on' : ''}" data-id="${id}"><canvas width="32" height="32" data-date="${id}"></canvas>${esc(title)}<canvas class="tick" data-icon="${ICON.check}" width="16" height="16"></canvas></button>`;
  const card = showPanel(`
    <h2>which one do we do for real?</h2>
    <div class="grid">
      ${C.dates.map((d) => opt(d.id, d.title)).join('')}
      ${opt('custom', 'my own idea')}
    </div>
    <div id="custom-wrap" class="${fin.choice === 'custom' ? '' : 'hidden'}">
      <input class="txt" id="custom" maxlength="120" placeholder="tell me your idea..." value="${esc(fin.custom)}">
    </div>
    <button class="pbtn green" id="next" ${canNext() ? '' : 'disabled'}>next →</button>
  `, 'wide');
  card.querySelectorAll('canvas[data-date]').forEach((c) => {
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    frame(g, 'dateIcons', 32, 32, DATE_ICON_IDX[c.dataset.date], 0, 0, 0);
  });
  card.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => {
    fin.choice = b.dataset.id;
    SFX.select();
    card.querySelectorAll('.opt').forEach((o) => o.classList.toggle('on', o === b));
    card.querySelector('#custom-wrap').classList.toggle('hidden', fin.choice !== 'custom');
    if (fin.choice === 'custom') card.querySelector('#custom').focus();
    card.querySelector('#next').disabled = !canNext();
  }));
  card.querySelector('#custom').addEventListener('input', (e) => { fin.custom = e.target.value; card.querySelector('#next').disabled = !canNext(); });
  card.querySelector('#next').addEventListener('click', () => { if (!canNext()) return; SFX.select(); fin.step = 'when'; fin.slot = null; renderFinal(); });
}
function canNext() { return fin.choice && (fin.choice !== 'custom' || fin.custom.trim().length > 1); }

function renderWhen() {
  const isCabin = fin.choice === 'cabin';
  const slots = isCabin ? SLOTS.cabin : SLOTS.normal;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const m = fin.month;
  const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const maxMonth = new Date(today.getFullYear(), today.getMonth() + 6, 1);
  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // monday first
  const daysIn = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  let cells = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'].map((d) => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < offset; i++) cells += '<div></div>';
  for (let day = 1; day <= daysIn; day++) {
    const d = new Date(m.getFullYear(), m.getMonth(), day);
    const past = d < today;
    const on = fin.date && d.getTime() === fin.date.getTime();
    const we = d.getDay() === 0 || d.getDay() === 6;
    const cls = [on ? 'on' : '', we ? 'we' : '', d.getTime() === today.getTime() ? 'today' : ''].join(' ');
    cells += `<button class="${cls}" data-day="${day}" ${past ? 'disabled' : ''}>${day}</button>`;
  }
  const card = showPanel(`
    <div class="cols">
      <div>
        <h2>when?</h2>
        <div class="cal-head">
          <button class="cal-nav" id="prev" ${m <= minMonth ? 'disabled' : ''}><canvas data-icon="${ICON.left}" width="16" height="16"></canvas></button>
          <b>${MONTHS[m.getMonth()]} ${m.getFullYear()}</b>
          <button class="cal-nav" id="nextm" ${m >= maxMonth ? 'disabled' : ''}><canvas data-icon="${ICON.right}" width="16" height="16"></canvas></button>
        </div>
        <div class="cal">${cells}</div>
      </div>
      <div>
        <p class="small">${esc(choiceTitle())}${isCabin ? ' · pick the day we leave' : ''}</p>
        <span class="label">${isCabin ? 'how long?' : 'what time?'}</span>
        <div class="chips">${slots.map((s) => `<button class="pbtn${fin.slot === s.id ? ' green' : ''}" data-slot="${s.id}">${s.label}</button>`).join('')}</div>
        <div class="row">
          <button class="pbtn" id="back">←</button>
          <button class="pbtn green" id="next" ${fin.date && fin.slot ? '' : 'disabled'}>next →</button>
        </div>
      </div>
    </div>
  `, 'wide');
  card.querySelector('#prev').addEventListener('click', () => { fin.month = new Date(m.getFullYear(), m.getMonth() - 1, 1); SFX.blip('x'); renderWhen(); });
  card.querySelector('#nextm').addEventListener('click', () => { fin.month = new Date(m.getFullYear(), m.getMonth() + 1, 1); SFX.blip('x'); renderWhen(); });
  card.querySelectorAll('.cal button[data-day]').forEach((b) => b.addEventListener('click', () => {
    fin.date = new Date(m.getFullYear(), m.getMonth(), +b.dataset.day); SFX.select(); renderWhen();
  }));
  card.querySelectorAll('[data-slot]').forEach((b) => b.addEventListener('click', () => { fin.slot = b.dataset.slot; SFX.select(); renderWhen(); }));
  card.querySelector('#back').addEventListener('click', () => { SFX.back(); fin.step = 'choose'; renderFinal(); });
  card.querySelector('#next').addEventListener('click', () => { if (!fin.date || !fin.slot) return; SFX.select(); fin.step = 'note'; renderFinal(); });
}

function slotObj() { return (fin.choice === 'cabin' ? SLOTS.cabin : SLOTS.normal).find((s) => s.id === fin.slot); }
function whenText(date, slot, isCabin) {
  if (isCabin && slot.days) return `${fmtDate(date)} → ${fmtDate(addDays(date, slot.days))}`;
  return fmtDate(date) + (slot.from ? ` · ${slot.label}` : isCabin ? '' : ' · you decide the time');
}

function ticketHtml(title, when, note) {
  return `<div class="ticket">
      <div class="t-title">admit two ♥</div>
      <div class="t-big">${esc(title)}</div>
      <div class="t-line">${esc(when)}</div>
      ${note ? `<div class="t-line">✎ ${esc(note)}</div>` : ''}
    </div>`;
}

function renderNote() {
  const slot = slotObj(), isCabin = fin.choice === 'cabin';
  const card = showPanel(`
    <div class="cols">
      <div class="col-art">${ticketHtml(choiceTitle(), whenText(fin.date, slot, isCabin), '')}</div>
      <div>
        <h2>almost done</h2>
        <span class="label">anything else? (optional)</span>
        <textarea class="txt" id="note" maxlength="400" placeholder="wishes, ideas, what you wanna eat after...">${esc(fin.note)}</textarea>
        <div class="row">
          <button class="pbtn" id="back">←</button>
          <button class="pbtn green" id="send">send it ♥</button>
        </div>
      </div>
    </div>
  `, 'wide');
  card.querySelector('#note').addEventListener('input', (e) => { fin.note = e.target.value; });
  card.querySelector('#back').addEventListener('click', () => { SFX.back(); fin.step = 'when'; renderFinal(); });
  card.querySelector('#send').addEventListener('click', async (e) => {
    const b = e.currentTarget;
    if (b.disabled) return;
    b.disabled = true; b.textContent = 'sending...';
    const entry = {
      choiceId: fin.choice, title: choiceTitle(), custom: fin.choice === 'custom' ? fin.custom.trim() : '',
      date: fin.date.toISOString(), when: whenText(fin.date, slot, isCabin), slot: fin.slot, note: fin.note.trim(),
      sentAt: new Date().toISOString(),
    };
    entry.calLink = calendarLink(entry);
    track('final', { title: entry.title, when: entry.when, note: entry.note, custom: entry.custom });
    entry.changed = (save.log || []).filter((x) => x.e === 'final').length > 1;
    entry.emailed = await sendEmail(entry);
    save.submitted = entry; persist();
    updateHud();
    celebrate();
    showTicket(entry, false);
  });
}

function eventTimes(entry) {
  const d = new Date(entry.date);
  const isCabin = entry.choiceId === 'cabin';
  const slot = (isCabin ? SLOTS.cabin : SLOTS.normal).find((s) => s.id === entry.slot) || {};
  if (!isCabin && slot.from) return { allDay: false, start: `${ymd(d)}T${slot.from}0000`, end: `${ymd(d)}T${slot.to}0000` };
  return { allDay: true, start: ymd(d), end: ymd(addDays(d, (slot.days || 0) + 1)) };
}
function calendarLink(entry) {
  const t = eventTimes(entry);
  const p = new URLSearchParams({
    action: 'TEMPLATE', text: `date with ${C.herName}: ${entry.title}`,
    dates: `${t.start}/${t.end}`, details: entry.note || `picked in ${C.herName}'s date quest ♥`, ctz: 'Europe/Berlin',
  });
  return 'https://calendar.google.com/calendar/render?' + p.toString();
}
function icsFile(entry) {
  const t = eventTimes(entry);
  const dt = (v) => (t.allDay ? `;VALUE=DATE:${v}` : `;TZID=Europe/Berlin:${v}`);
  const clean = (s) => String(s).replace(/[,;\\]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//mali date quest//EN', 'BEGIN:VEVENT',
    `UID:${Date.now()}@mali-date-quest`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
    `DTSTART${dt(t.start)}`, `DTEND${dt(t.end)}`,
    `SUMMARY:${clean('date with ' + C.hisName + ': ' + entry.title)}`,
    `DESCRIPTION:${clean(entry.note || 'from mali\'s date quest ♥')}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

// everything she did, as plain text for the email
function trackerText() {
  const L = save.log || [];
  const fmtT = (t) => { try { return new Date(t).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { return new Date(t).toISOString(); } };
  const mins = Math.max(1, Math.round((save.playTime || 0) / 60));
  const sessions = save.sessions || 1;
  const out = [];
  out.push(`played for about ${mins} min in ${sessions} session${sessions > 1 ? 's' : ''}${save.startedAt ? `, started ${fmtT(save.startedAt)}` : ''}`);
  const yes = L.find((e) => e.e === 'answer' && /date with me/.test(e.q));
  if (yes) out.push(`"will you go on a date with me?" → ${yes.a}${yes.dodges ? ` (she tried to press "no" ${yes.dodges}x lol)` : ' (first try!)'}`);
  const dates = L.filter((e) => e.e === 'date');
  out.push('', 'dates she tried, in order:');
  dates.forEach((e, i) => {
    const d = dateById(e.id);
    out.push(`${i + 1}. ${d ? d.title : e.id}: ${e.result}${e.replay ? ' (played it again)' : ''} · ${Math.round(((e.secs || 0) / 60) * 10) / 10} min · ${fmtT(e.t)}`);
  });
  const answers = L.filter((e) => e.e === 'answer' && !/date with me/.test(e.q));
  if (answers.length) {
    out.push('', 'her answers on the way:');
    answers.forEach((a) => { const d = a.ctx && dateById(a.ctx); out.push(`- ${d ? `[${d.title}] ` : ''}"${a.q}" → ${a.a}`); });
  }
  const pets = L.filter((e) => e.e === 'cat').map((e) => e.name);
  const uniq = [...new Set(pets)];
  out.push('', `cats she pet: ${uniq.length ? uniq.join(', ') : 'none :('} (${uniq.length}/${C.cats.length}, ${pets.length} pets in total)`);
  const finals = L.filter((e) => e.e === 'final');
  if (finals.length > 1) { out.push('', 'she changed her pick:'); finals.forEach((f) => out.push(`- ${f.title} · ${f.when} (${fmtT(f.t)})`)); }
  return out.join('\n');
}

async function sendEmail(entry) {
  const tracker = trackerText();
  const lines = [
    `${C.herName} made her choice ♥${entry.changed ? ' (she changed her pick, this is the new one)' : ''}`,
    '',
    `date: ${entry.title}`,
    entry.custom ? `(her own idea: "${entry.custom}")` : null,
    `when: ${entry.when}`,
    `note: ${entry.note || '-'}`,
    '',
    `add it to your calendar: ${entry.calLink}`,
    '',
    '------------ tracker: what she did ------------',
    tracker,
  ].filter((l) => l !== null);
  const payload = {
    access_key: C.web3formsKey,
    subject: `💌 ${C.herName} picked: ${entry.title} (${entry.when})${entry.changed ? ' [changed]' : ''}`,
    from_name: `${C.herName}'s date quest`,
    date_pick: entry.title,
    when: entry.when,
    note: entry.note || '-',
    calendar: entry.calLink,
    tracker,
    message: lines.join('\n'),
    botcheck: '',
  };
  if (!C.web3formsKey) {
    console.info('[test mode] no web3forms key set in js/config.js, this would have been emailed:', payload);
    return 'test';
  }
  try {
    const r = await fetch('https://api.web3forms.com/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    return !!(r.ok && j.success !== false);
  } catch (e) {
    console.warn('email failed', e);
    return false;
  }
}

function celebrate() {
  SFX.heart();
  setTimeout(() => SFX.win(), 400);
  for (let i = 0; i < 30; i++) setTimeout(() => burst(W / 2 + rnd(-120, 120), H / 2 + rnd(-60, 20), i % 2 ? 'heart' : 'spark', 2), i * 60);
}

function showTicket(entry, again) {
  uiStack.length = 0;
  uiStack.push({ tapAdvance: false });
  const status = entry.emailed === true
    ? `<p class="small">✓ ${esc(C.hisName)} just got a message</p>`
    : entry.emailed === 'test'
      ? '<p class="small">(test mode: put the web3forms key in js/config.js so the email really goes out)</p>'
      : `<p class="small">hmm the message didn't go through. screenshot this and send it to ${esc(C.hisName)} :)</p>`;
  const card = showPanel(`
    <div class="cols">
      <div class="col-art">${ticketHtml(entry.title, entry.when, entry.note)}</div>
      <div>
        <h2>it's a date ♥</h2>
        ${again ? '' : status}
        <button class="pbtn green" id="ics"><canvas data-icon="${ICON.calendar}" width="16" height="16"></canvas>add to my calendar</button>
        <div class="row" style="margin-top: calc(var(--u) * 3)">
          <button class="pbtn" id="town">back to town</button>
          ${again ? '<button class="pbtn" id="redo">change it</button>' : ''}
        </div>
      </div>
    </div>
  `, 'wide');
  card.querySelector('#ics').addEventListener('click', () => {
    const blob = new Blob([icsFile(entry)], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'our-date.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });
  card.querySelector('#town').addEventListener('click', async () => {
    hidePanel(); uiStack.length = 0;
    if (!again) {
      await talk([['me:love', 'can\'t wait ♥']]);
      const [c, g] = makeCanvas(64, 48);
      drawChar(g, 'her', 22, 44, 'right', false, 0);
      drawChar(g, 'him', 42, 44, 'left', false, 0.4);
      g.drawImage(HEART_SPR, 29, 2);
      await cardPanel({
        title: 'the end ♥',
        lines: ['that was the whole game. thank you for playing it.', `${C.hisName} got your pick and will plan everything.`, 'you can keep walking around and petting cats if you want :)'],
        button: 'back to town',
        art: artCanvas(c, 96),
      });
    }
    await fadeOut(3);
    setScene(world);
    world.placeAt(26, 22, 'down');
    world.frozen = false;
    await fadeIn(3);
  });
  const redo = card.querySelector('#redo');
  if (redo) redo.addEventListener('click', () => {
    track('changed', { from: save.submitted && save.submitted.title });
    save.submitted = null; persist(); hidePanel(); uiStack.length = 0;
    const now = new Date();
    Object.assign(fin, { step: 'choose', choice: null, custom: '', date: null, slot: null, note: '', month: new Date(now.getFullYear(), now.getMonth(), 1) });
    renderFinal();
  });
}
