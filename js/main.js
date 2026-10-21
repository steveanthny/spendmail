// SpendMail coming-soon page: intro, headline weight field, magnetic CTA,
// waitlist form, stage parallax and the four-step invoice demo.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const lerp = (a, b, t) => a + (b - a) * t;
const money = (n) => Math.round(n).toLocaleString('en-US');

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const EASE = 'cubic-bezier(.22, 1, .36, 1)';

/* ---------- Text swap: old text rolls up, new rolls in ---------- */
function swap(el, text, { instant = false } = {}) {
  if (!el || el._text === text) return;
  el._text = text;
  const next = document.createElement('span');
  next.className = 'swap__in';
  next.textContent = text;
  const prev = $$('.swap__in', el).filter((n) => !n._leaving);
  if (instant || reduce || !prev.length) {
    el.replaceChildren(next);
    return;
  }
  prev.forEach((old) => {
    old._leaving = true;
    old.animate(
      [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-80%)', opacity: 0 }],
      { duration: 360, easing: EASE, fill: 'forwards' }
    );
    // timer rather than onfinish: animations stall in background tabs
    setTimeout(() => old.remove(), 380);
  });
  el.append(next);
  next.animate(
    [{ transform: 'translateY(80%)', opacity: 0 }, { transform: 'none', opacity: 1 }],
    { duration: 520, easing: EASE }
  );
}
for (const el of $$('.swap')) el._text = el.textContent.trim();

/* ---------- Headline: letters thicken near the cursor ---------- */
const chars = [];
for (const line of $$('.hero__title .line__in')) {
  const text = line.textContent;
  line.textContent = '';
  for (const c of text) {
    const s = document.createElement('span');
    s.className = c === ' ' ? 'ch ch--sp' : 'ch';
    s.textContent = c === ' ' ? ' ' : c;
    line.append(s);
    if (c !== ' ') chars.push({ el: s, x: 0, y: 0, w: 600, tw: 600 });
  }
}
function measureChars() {
  for (const c of chars) {
    const r = c.el.getBoundingClientRect();
    c.x = r.left + r.width / 2 + scrollX;
    c.y = r.top + r.height / 2 + scrollY;
  }
}

/* ---------- Pointer state shared by the frame loop ---------- */
const ptr = { x: -9999, y: -9999, active: false };
if (fine && !reduce) {
  addEventListener('pointermove', (e) => {
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.active = true;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { ptr.active = false; });
  addEventListener('blur', () => { ptr.active = false; });
}

/* ---------- Magnetic button ---------- */
const magnets = $$('.magnetic').map((el) => ({ el, label: $('.join__label', el), x: 0, y: 0 }));

/* ---------- Logo: the paper plane flies in, sends on hover, eyes the cursor ---------- */
const logo = {
  box: $('.logo'),
  home: $('.brand__home'),
  plane: $('.logo__plane'),
  img: $('.logo__plane img'),
  dot: $('.logo__dot'),
  trail: $('.logo__trail'),
  line: $('.logo__trail-line'),
  mask: $('.logo__trail-mask'),
  rot: 0,
  busy: false,
};
// rest position of the plane's centre in logo coordinates (Figma: x 94.79, 14 × 14)
const PLANE = { x: 101.79, y: 7 };
// landing curve: skims just above the wordmark (its letters start at y 10.2) into the rest spot
const ARC = [[-18, 4], [30, -6], [75, 10], [PLANE.x, PLANE.y]];
const ARC_D = `M${ARC[0]} C${ARC[1]} ${ARC[2]} ${ARC[3]}`;
logo.line.setAttribute('d', ARC_D);
logo.mask.setAttribute('d', ARC_D);

function bez(t, k) {
  const u = 1 - t;
  return u * u * u * ARC[0][k] + 3 * u * u * t * ARC[1][k] + 3 * u * t * t * ARC[2][k] + t * t * t * ARC[3][k];
}
function bezTangent(t, k) {
  const u = 1 - t;
  return 3 * u * u * (ARC[1][k] - ARC[0][k]) + 6 * u * t * (ARC[2][k] - ARC[1][k]) + 3 * t * t * (ARC[3][k] - ARC[2][k]);
}
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

function hopDot(delay = 0) {
  logo.dot.animate(
    [{ transform: 'none' }, { transform: 'translateY(-5px) scale(1.15)', offset: 0.35 }, { transform: 'translateY(1px) scale(.95, 1.05)', offset: 0.7 }, { transform: 'none' }],
    { duration: 620, delay, easing: 'cubic-bezier(.34, 1.3, .64, 1)' }
  );
}

// intro: fly along ARC with a dashed contrail, then the i-dot drops into place
function landLogo() {
  if (reduce) { logo.box.classList.add('is-landed'); return; }
  const N = 40;
  const frames = [];
  for (let i = 0; i <= N; i++) {
    const t = easeInOut(i / N);
    const x = bez(t, 0) - PLANE.x;
    const y = bez(t, 1) - PLANE.y;
    // the mark already points up-right (-45°), so turn it by the tangent + 45°,
    // then pull up into its resting angle over the last stretch
    const along = (Math.atan2(bezTangent(t, 1), bezTangent(t, 0)) * 180) / Math.PI + 45;
    const settle = clamp((i / N - 0.7) / 0.3);
    const a = lerp(along, 0, settle * settle * (3 - 2 * settle));
    frames.push({ transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${a.toFixed(1)}deg)`, opacity: Math.min(1, i / 6) });
  }
  logo.busy = true;
  logo.box.classList.add('is-landed');
  logo.dot.style.opacity = '0';
  logo.trail.style.opacity = '1';
  const fly = logo.img.animate(frames, { duration: 1300, easing: 'linear' });
  logo.mask.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1300, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'forwards' });
  fly.onfinish = () => {
    logo.busy = false;
    logo.trail.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, easing: EASE, fill: 'forwards' });
    logo.dot.style.opacity = '';
    logo.dot.animate(
      [{ transform: 'translateY(-10px)', opacity: 0 }, { transform: 'translateY(1px) scale(1.1, .9)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }],
      { duration: 520, easing: 'cubic-bezier(.34, 1.3, .64, 1)' }
    );
  };
}

// "send": the plane shoots off top-right and loops back in from below the dot
function sendLogo() {
  if (reduce || logo.busy || !logo.box.classList.contains('is-landed')) return;
  logo.busy = true;
  const a = logo.img.animate(
    [
      { transform: 'none', opacity: 1 },
      { transform: 'translate(-2px, 2px) scale(.92)', opacity: 1, offset: 0.12 },
      { transform: 'translate(22px, -22px) scale(.6)', opacity: 0, offset: 0.42 },
      { transform: 'translate(-18px, 16px) scale(.6) rotate(-10deg)', opacity: 0, offset: 0.43 },
      { transform: 'none', opacity: 1 },
    ],
    { duration: 1000, easing: 'cubic-bezier(.45, 0, .2, 1)' }
  );
  hopDot(640);
  a.onfinish = () => { logo.busy = false; };
}
logo.home.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') sendLogo(); });
logo.home.addEventListener('focus', sendLogo);

/* ---------- Waitlist form (no backend yet: stored on this device only) ---------- */
const form = $('.join');
const input = $('#email');
const msg = $('.join__msg');
const btnLabel = $('.join__label');
const KEY = 'spendmail-waitlist';
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;

function joined(email, animate) {
  form.classList.remove('is-sending', 'is-error', 'is-valid');
  form.classList.add('is-done');
  input.value = email;
  input.readOnly = true;
  swap(btnLabel, 'You’re on the list', { instant: !animate });
  msg.innerHTML = '';
  msg.append(`We’ll write to ${email} when SpendMail opens. `);
  const change = document.createElement('button');
  change.type = 'button';
  change.textContent = 'Use a different email';
  change.addEventListener('click', () => {
    try { localStorage.removeItem(KEY); } catch {}
    form.classList.remove('is-done');
    input.readOnly = false;
    input.value = '';
    msg.textContent = '';
    swap(btnLabel, 'Be Among the First');
    input.focus();
  });
  msg.append(change);
}

try {
  const saved = localStorage.getItem(KEY);
  if (saved) joined(saved, false);
} catch {}

input.addEventListener('input', () => {
  form.classList.remove('is-error');
  if (!form.classList.contains('is-done')) msg.textContent = '';
  form.classList.toggle('is-valid', EMAIL.test(input.value.trim()));
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (form.classList.contains('is-done') || form.classList.contains('is-sending')) return;
  const v = input.value.trim();
  if (!EMAIL.test(v)) {
    form.classList.remove('is-error');
    void form.offsetWidth; // restart the shake
    form.classList.add('is-error');
    msg.textContent = v ? 'That doesn’t look like an email. Try name@company.com.' : 'Add your work email to join the list.';
    input.focus();
    return;
  }
  form.classList.add('is-sending');
  swap(btnLabel, 'Adding you…');
  setTimeout(() => {
    try { localStorage.setItem(KEY, v); } catch {}
    joined(v, true);
  }, reduce ? 0 : 750);
});

/* ---------- Demo timeline ---------- */
const stageEl = $('.stage');
const card = $('.card');
const tilt = $('.tilt');
const clouds = $('.stage__clouds');
const views = $$('.view');
const chips = $$('.chip');
const conns = $$('.conn');
const barFill = $('.bar__fill');
const heads = { from: $('[data-k="from"]'), meta: $('[data-k="meta"]'), subject: $('[data-k="subject"]') };
const verb = $('[data-k="verb"]');
const tail = $('[data-k="tail"]');
const ccEl = $('.cc');
const ccTyped = $('.cc__typed');
const scan = $('.scan');
const approve = $('.approve');
const approveLabel = $('.approve__label');
const ctrl = $('.ctrl');
const ctrlBtn = $('.ctrl__btn');
const ctrlLabel = $('.ctrl__label');
const ring = $('.ctrl__ring-fill');

const STAGES = [
  { dur: 4.6, bar: (l) => clamp(l / 3.2) },
  { dur: 7.4, bar: (l) => easeOut(clamp((l - 0.4) / 3.2)) },
  { dur: 9.0, bar: (l) => clamp(l / 7.2) },
  { dur: 7.0, bar: () => 1 },
];
let total = 0;
for (const s of STAGES) { s.at = total; total += s.dur; }
const LOOP = total;
const CC_ADDR = 'check@spendmail.com';

function headFor(i, l) {
  switch (i) {
    case 0: return { from: 'From: billing@northlineimaging.com', meta: l < 2.9 ? 'Received' : 'Cc’d to SpendMail', subject: 'INV-2291 · Northline Imaging' };
    case 1: return { from: 'From: check@spendmail.com', meta: l < 3.6 ? 'Validating…' : 'Replied in 2 min', subject: 'Re: INV-2291 · Northline Imaging' };
    case 2: return { from: 'To: billing@northlineimaging.com', meta: l < 6.9 ? 'Negotiating…' : 'Correction received', subject: 'INV-2291 · Two lines to correct' };
    default: return { from: 'From: check@spendmail.com', meta: 'Resolved in 4 hrs', subject: 'INV-2291-R · Ready to pay' };
  }
}

// cues: every [data-in] inside a view, with times local to that view's stage
const cues = views.map((v) => $$('[data-in]', v).map((el) => ({
  el,
  at: +el.dataset.in,
  out: el.dataset.out ? +el.dataset.out : Infinity,
  done: el.dataset.done ? +el.dataset.done : null,
  on: null,
  isDone: null,
})));
const counters = views.map((v) => $$('[data-count]', v).map((el) => ({
  el, value: +el.dataset.count, at: +el.dataset.at, prefix: el.dataset.prefix, text: null,
})));

let t = 0;
let stage = -1;
let playing = !reduce;
let started = false;
let hoverHold = false;
let inView = true;

function stageAt(time) {
  for (let i = STAGES.length - 1; i >= 0; i--) if (time >= STAGES[i].at) return i;
  return 0;
}

function applyCues(i, l) {
  for (const c of cues[i]) {
    const on = l >= c.at && l < c.out;
    if (on !== c.on) { c.on = on; c.el.classList.toggle('on', on); }
    if (c.done !== null) {
      const d = l >= c.done;
      if (d !== c.isDone) {
        c.isDone = d;
        c.el.classList.toggle('done', d);
        // rows that need attention get a brief warm flash
        if (d && !$('.pill--good', c.el) && !views[i].classList.contains('snap')) {
          c.el.classList.remove('flash'); void c.el.offsetWidth; c.el.classList.add('flash');
        }
      }
    }
  }
  for (const n of counters[i]) {
    const text = l < n.at ? '—' : n.prefix + money(n.value * easeOut(clamp((l - n.at) / 1.2)));
    if (text !== n.text) { n.text = text; n.el.textContent = text; }
  }
}

function activate(i, l) {
  views.forEach((v, j) => {
    const on = j === i;
    v.classList.toggle('is-active', on);
    v.inert = !on;
  });
  // snap the incoming view to its state at this moment, then let cues animate
  const v = views[i];
  v.classList.add('snap');
  for (const c of cues[i]) { c.on = null; c.isDone = null; }
  for (const n of counters[i]) n.text = null;
  applyCues(i, l);
  if (i === 3) resetApprove();
  void v.offsetWidth;
  v.classList.remove('snap');
}

let ccShown = -1;
let tailState = null;
let lastBar = -1;
let lastRing = -1;
const connState = [];

function render() {
  const i = stageAt(t);
  const l = t - STAGES[i].at;
  if (i !== stage) { stage = i; activate(i, l); }
  else applyCues(i, l);

  const h = headFor(i, l);
  swap(heads.from, h.from);
  swap(heads.meta, h.meta);
  swap(heads.subject, h.subject);

  const bar = STAGES[i].bar(l);
  if (Math.abs(bar - lastBar) > 0.001) { lastBar = bar; barFill.style.transform = `scaleX(${Math.max(0.02, bar)})`; }

  // stepper
  chips.forEach((c, j) => {
    c.classList.toggle('is-active', j === i);
    c.classList.toggle('is-done', j < i);
    c.setAttribute('aria-current', j === i ? 'step' : 'false');
  });
  conns.forEach((c, j) => {
    const state = j < i ? 'done' : j === i ? 'live' : 'idle';
    if (connState[j] !== state) {
      connState[j] = state;
      c.classList.toggle('is-done', state === 'done');
      c.classList.toggle('is-live', state === 'live');
    }
    if (state === 'live') c.style.setProperty('--p', clamp(l / STAGES[i].dur).toFixed(3));
  });

  // 1 · cc address types itself in
  if (i === 0) {
    const n = Math.floor(clamp((l - 0.9) / 1.1) * CC_ADDR.length);
    if (n !== ccShown) {
      // the demo's email reaches SpendMail: the logo's plane sends too
      if (n === CC_ADDR.length && ccShown >= 0 && ccShown < n && playing) sendLogo();
      ccShown = n;
      ccTyped.textContent = CC_ADDR.slice(0, n);
    }
    ccEl.classList.toggle('is-typing', l > 0.6 && n < CC_ADDR.length);
    ccEl.classList.toggle('is-set', n === CC_ADDR.length);
  }

  // 2 · scan line and the verdict sentence
  if (i === 1) {
    const scanning = l >= 0.4 && l <= 3.4;
    scan.classList.toggle('on', scanning);
    if (scanning) scan.style.setProperty('--scan', easeOut(clamp((l - 0.4) / 3)).toFixed(4));
    const done = l >= 3.6;
    swap(verb, done ? 'Checked' : 'Checking');
    if (done !== tailState) {
      tailState = done;
      tail.textContent = done ? '. 12 match. 2 need a look before payment.' : '…';
      tail.classList.toggle('is-new', done && !reduce);
    }
  }

  const loopP = t / LOOP;
  if (Math.abs(loopP - lastRing) > 0.002) { lastRing = loopP; ring.style.strokeDashoffset = (100 - loopP * 100).toFixed(2); }
}

function seek(time) {
  t = clamp(time, 0, LOOP - 0.001);
  stage = -1; // force a snap into the target view
  render();
}

// chips jump to a step; with reduced motion, show each step fully played
chips.forEach((c) => c.addEventListener('click', () => {
  const i = +c.dataset.stage;
  seek(reduce || !playing ? STAGES[i].at + STAGES[i].dur - 0.01 : STAGES[i].at);
}));

function setPlaying(p) {
  playing = p;
  ctrl.classList.toggle('is-paused', !p);
  ctrlBtn.setAttribute('aria-label', p ? 'Pause the demo' : 'Play the demo');
  syncLabel();
}
function syncLabel() {
  swap(ctrlLabel, !playing ? 'Paused' : hoverHold ? 'Paused while you read' : 'Playing');
  ctrl.classList.toggle('is-held', playing && hoverHold);
}
ctrlBtn.addEventListener('click', () => setPlaying(!playing));

if (fine) {
  card.addEventListener('pointerenter', () => { hoverHold = true; syncLabel(); });
  card.addEventListener('pointerleave', () => { hoverHold = false; syncLabel(); });
}
new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: 0.15 }).observe(stageEl);

// 4 · approve the corrected invoice
function resetApprove() {
  approve.classList.remove('is-approved');
  approve.disabled = false;
  swap(approveLabel, 'Approve $14,760', { instant: true });
}
approve.addEventListener('click', (e) => {
  if (approve.classList.contains('is-approved')) return;
  approve.classList.add('is-approved');
  swap(approveLabel, 'Approved ✓');
  if (reduce) return;
  const r = approve.getBoundingClientRect();
  const x = (e.clientX || r.left + r.width / 2) - r.left;
  const y = (e.clientY || r.top + r.height / 2) - r.top;
  for (let k = 0; k < 14; k++) {
    const d = document.createElement('span');
    d.className = 'burst';
    d.style.left = `${x - 3}px`;
    d.style.top = `${y - 3}px`;
    if (k % 3 === 1) d.style.background = '#fff';
    approve.append(d);
    const a = (k / 14) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 26 + Math.random() * 34;
    d.animate(
      [{ transform: 'none', opacity: 1 }, { transform: `translate(${Math.cos(a) * dist}px, ${Math.sin(a) * dist * 0.6}px) scale(.2)`, opacity: 0 }],
      { duration: 700 + Math.random() * 300, easing: EASE }
    ).onfinish = () => d.remove();
  }
});

/* ---------- Frame loop: clock + pointer effects ---------- */
/* ---------- Alias strip: endless marquee of random @spendmail.com addresses ---------- */
const LOCALS = [
  'ap', 'accounts', 'invoices', 'billing', 'payables', 'procurement', 'finance', 'contracts',
  'vendors', 'purchasing', 'spend', 'audit', 'controller', 'cfo', 'ops', 'legal', 'facilities',
  'it', 'renewals', 'saas', 'travel', 'supplies', 'fleet', 'x', 'team', 'radiology', 'pharmacy',
  'clinic-ops', 'marketing', 'payroll', 'leases', 'utilities', 'freight', 'logistics', 'treasury',
  'tax', 'insurance', 'telecom', 'software', 'events', 'maintenance', 'energy', 'receiving',
  'ap+northline', 'invoices+acme', 'contracts+2026', 'procurement.emea', 'finance.us',
  'legal-review', 'vendor-mgmt', 'cost-control',
];
const aliasBox = $('.aliases');
const aliasView = $('.aliases__view');
const aliasTrack = $('.aliases__track');
const aliasItems = [];
const recentAliases = [];
const alias = { x: 0, speed: reduce ? 0 : 36, hover: false };

function nextAlias() {
  let a;
  do a = LOCALS[Math.floor(Math.random() * LOCALS.length)];
  while (recentAliases.includes(a));
  recentAliases.push(a);
  if (recentAliases.length > 12) recentAliases.shift();
  return a;
}
// keep the track at least one view-width (plus slack) ahead of the scroll
function fillAliases() {
  const need = aliasView.clientWidth + 160;
  let total = aliasItems.reduce((s, it) => s + it.w, 0);
  while (total - alias.x < need) {
    const el = document.createElement('span');
    el.className = 'alias';
    const b = document.createElement('b');
    b.textContent = nextAlias();
    el.append(b, '@spendmail.com,');
    aliasTrack.append(el);
    const it = { el, w: el.offsetWidth };
    aliasItems.push(it);
    total += it.w;
  }
}
function remeasureAliases() {
  for (const it of aliasItems) it.w = it.el.offsetWidth;
  fillAliases();
}
function stepAliases(dt) {
  const target = alias.hover || reduce ? 0 : 36; // px per second
  alias.speed = lerp(alias.speed, target, Math.min(1, dt * 5));
  if (alias.speed < 0.05 && target === 0) return;
  alias.x += alias.speed * dt;
  // an address that has scrolled out is dropped; fillAliases adds a fresh random one
  while (aliasItems.length && alias.x >= aliasItems[0].w) {
    alias.x -= aliasItems[0].w;
    aliasItems.shift().el.remove();
  }
  fillAliases();
  aliasTrack.style.transform = `translate3d(${(-alias.x).toFixed(2)}px, 0, 0)`;
}
fillAliases();
aliasBox.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') alias.hover = true; });
aliasBox.addEventListener('pointerleave', () => { alias.hover = false; });

const fx = { tx: 0, ty: 0, x: 0, y: 0 };
let last = performance.now();
let measured = false;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  if (started && playing && !hoverHold && inView && !document.hidden) {
    t += dt;
    if (t >= LOOP) t -= LOOP;
  }
  render();
  if (inView && !document.hidden) stepAliases(dt);

  if (fine && !reduce) {
    // stage parallax: card tilts toward the pointer, clouds drift away from it
    const r = stageEl.getBoundingClientRect();
    const inside = ptr.active && ptr.x >= r.left && ptr.x <= r.right && ptr.y >= r.top && ptr.y <= r.bottom;
    fx.tx = inside ? ((ptr.x - r.left) / r.width - 0.5) * 2 : 0;
    fx.ty = inside ? ((ptr.y - r.top) / r.height - 0.5) * 2 : 0;
    fx.x = lerp(fx.x, fx.tx, 0.07);
    fx.y = lerp(fx.y, fx.ty, 0.07);
    if (Math.abs(fx.x - fx.tx) + Math.abs(fx.y - fx.ty) > 0.0005 || fx.x || fx.y) {
      // translate only: a 3D tilt rasterises the card and softens its text
      card.style.transform = `translate(${(fx.x * 8).toFixed(1)}px, ${(fx.y * 6).toFixed(1)}px)`;
      clouds.style.transform = `translate3d(${(-fx.x * 18).toFixed(2)}px, ${(-fx.y * 10).toFixed(2)}px, 0)`;
    }
    if (inside) {
      stageEl.style.setProperty('--mx', `${ptr.x - r.left}px`);
      stageEl.style.setProperty('--my', `${ptr.y - r.top}px`);
    }

    // logo plane turns a little toward a nearby cursor
    const lb = logo.plane.getBoundingClientRect();
    const ldx = ptr.x - (lb.left + lb.width / 2);
    const ldy = ptr.y - (lb.top + lb.height / 2);
    const near = ptr.active && !logo.busy && Math.hypot(ldx, ldy) < 260;
    const want = near ? clamp((Math.atan2(ldy, ldx) * 180) / Math.PI + 45, -35, 35) : 0;
    const nr = lerp(logo.rot, want, 0.12);
    if (Math.abs(nr - logo.rot) > 0.05) {
      logo.rot = nr;
      logo.plane.style.transform = `rotate(${nr.toFixed(2)}deg)`;
    }

    // headline weight field
    if (!measured) { measureChars(); measured = true; }
    for (const c of chars) {
      let w = 600;
      if (ptr.active) {
        const dx = ptr.x + scrollX - c.x;
        const dy = (ptr.y + scrollY - c.y) * 1.4;
        w = 600 + 260 * Math.exp(-(dx * dx + dy * dy) / (2 * 70 * 70));
      }
      c.tw = w;
      const nw = lerp(c.w, c.tw, 0.12);
      if (Math.abs(nw - c.w) > 0.4) { c.w = nw; c.el.style.fontWeight = nw.toFixed(0); }
    }

    // magnetic button
    for (const m of magnets) {
      const b = m.el.getBoundingClientRect();
      const cx = b.left + b.width / 2 - m.x;
      const cy = b.top + b.height / 2 - m.y;
      const dx = ptr.x - cx;
      const dy = ptr.y - cy;
      const near = ptr.active && Math.abs(dx) < b.width / 2 + 40 && Math.abs(dy) < b.height / 2 + 30;
      const nx = lerp(m.x, near ? dx * 0.18 : 0, 0.15);
      const ny = lerp(m.y, near ? dy * 0.3 : 0, 0.15);
      if (Math.abs(nx - m.x) + Math.abs(ny - m.y) > 0.02) {
        m.x = nx; m.y = ny;
        m.el.style.transform = `translate3d(${nx.toFixed(2)}px, ${ny.toFixed(2)}px, 0)`;
        m.label.style.transform = `translate3d(${(nx * 0.35).toFixed(2)}px, ${(ny * 0.35).toFixed(2)}px, 0)`;
      }
    }
  }
  requestAnimationFrame(frame);
}

addEventListener('resize', () => { measured = false; fillAliases(); }, { passive: true });

/* ---------- Boot ---------- */
if (reduce) {
  // no autoplay: open on the validated invoice, fully played
  t = STAGES[1].at + STAGES[1].dur - 0.01;
  setPlaying(false);
}
// ?t=12.5 opens the demo paused at that second (handy for stills and QA)
const still = new URLSearchParams(location.search).get('t');
if (still !== null && !Number.isNaN(+still)) { t = clamp(+still, 0, LOOP - 0.001); setPlaying(false); }
render();

const fontsReady = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1200))]);
fontsReady.then(() => {
  measured = false;
  remeasureAliases(); // widths change once Switzer replaces the fallback font
  requestAnimationFrame(() => {
    root.classList.add('is-in');
    setTimeout(landLogo, reduce ? 0 : 350);
    setTimeout(() => root.classList.add('is-settled'), 1800);
    setTimeout(() => { started = true; }, reduce ? 0 : 1100);
  });
});
requestAnimationFrame(frame);
