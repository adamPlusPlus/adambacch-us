/* adambacch.us — the career comic is the playable spine of the page.
   Seven panels in story order; each opens in place into its quest and drops a card when played.
   Quest content lives in each panel's .pq-body (moved there in the markup; Spider is rendered by extras.js). */
(() => {
  'use strict';
  const HA = window.HA, Q = window.HAQ;
  if (!HA || !Q) return;
  const { $, $$, toast, reduced, company } = HA;
  const strip = $('#comicStrip');
  if (!strip) return;
  const panels = $$('.panel', strip);
  const has = (id) => Q.has(id);
  const isSheet = () => innerWidth < 760; // phones: quest goes near full-viewport with the page scroll locked
  // after the quest's card lands, collapse to the ✓ state (ms). null = stay open (it ends on a call to action)
  const AUTO_CLOSE = { spider: 2600, nat20: 3200, wip: 2600, certified: 3600, selfie: null, studio: null, sniped: null };
  // how long each panel's scene takes to turn into its activity (ms)
  const INTRO = { spider: 820, nat20: 1200, wip: 950, studio: 1150, certified: 1150, selfie: 850, sniped: 850 };

  /* ---------- company name in panel 6 ---------- */
  if (company) {
    const t = $('#panel-6 .b-co');
    if (t) { t.textContent = `Nice to meet you, ${company}.`; if (company.length > 6) t.style.fontSize = Math.max(10, Math.round(16 * 9 / (company.length + 3))) + 'px'; }
  }

  /* ---------- artifact slots: only files listed in img/artifacts/manifest.json are requested ---------- */
  fetch('img/artifacts/manifest.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : {})).then((m) => {
    const files = new Set((m && m.files) || []);
    $$('img[data-artifact]', strip).forEach((img) => {
      if (!files.has(img.dataset.artifact)) return;
      img.onload = () => { img.hidden = false; };
      img.src = 'img/artifacts/' + img.dataset.artifact;
    });
  }).catch(() => {});

  /* ---------- panel states: (a) untouched · (b) in progress · (c) completed (= card earned) ---------- */
  const TOUCH_KEY = 'hireAdam.panels.v1';
  let touched = new Set();
  try { touched = new Set(JSON.parse(localStorage.getItem(TOUCH_KEY) || '[]')); } catch { /* private mode */ }
  const markTouched = (n) => { touched.add(n); try { localStorage.setItem(TOUCH_KEY, JSON.stringify([...touched])); } catch { /* ignore */ } };

  /* ---------- played state + progress ---------- */
  const cpCount = $('#cpCount'), cpBar = $('#cpBar');
  function refresh() {
    let n = 0;
    panels.forEach((p) => {
      const played = has(p.dataset.card);
      if (played) n++;
      const wip = !played && touched.has(+p.dataset.p);
      p.classList.toggle('played', played);
      p.classList.toggle('s-done', played);
      p.classList.toggle('s-wip', wip);
      $('.pbadge', p).textContent = (played ? '✓ Played · ' : wip ? '▶ Resume · ' : '▶ Play · ') + $('.pq', p).getAttribute('aria-label').replace(/^Panel \d+ quest: /, '');
      $('.panel-btn', p).setAttribute('aria-label', `${played ? 'Replay' : 'Play'} panel ${p.dataset.p} of ${panels.length}: ${$('.pq', p).getAttribute('aria-label').replace(/^Panel \d+ quest: /, '')}. ${($('title', p) || {}).textContent || ''}`);
    });
    const img = $('#panel-6 .sf-img'), sf = Q.selfie && Q.selfie();
    if (img && sf && img.getAttribute('href') !== sf) img.setAttribute('href', sf);
    cpCount.textContent = `${n}/${panels.length} played`;
    cpBar.style.width = (n / panels.length) * 100 + '%';
    if (n === panels.length && !has('comic')) Q.earn('comic');
  }

  /* ---------- open / close in place: seamless both ways ----------
     Opening: the panel grows into place, its scene transforms (.intro), then becomes the activity (.live).
     Closing runs the same steps backwards (.closing): the activity fades, the camera pulls out, the panel shrinks back.
     History: opening pushes #panel-N, so Back closes the panel instead of leaving the page. */
  let openP = null, closeT = 0, introT = 0, popIgnore = false;
  const panelState = () => (history.state && history.state.haPanel) || 0;
  const cleanURL = () => location.pathname + location.search;
  const OUT_MS = { spider: 1450 };
  function flipFrom(p, first, ms = 420) {
    if (reduced) return;
    const last = p.getBoundingClientRect();
    if (!first.width || !last.width) return;
    const dx = first.left - last.left, dy = first.top - last.top, sx = first.width / last.width, sy = first.height / last.height;
    p.animate([{ transformOrigin: 'top left', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, { transformOrigin: 'top left', transform: 'none' }],
      { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }

  /* panel 1 art: the fanned cards gather into one pile, the pile flips face-down, the deal comes from it */
  const P1 = $('#panel-1'), FAN = $$('.cards > g:not(.pile-back)', P1), CARDS_G = $('.cards', P1), PILE_BACK = $('.pile-back', P1);
  const ANG = [-39, -13, 13, 39];
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const tween = (ms, fn) => new Promise((res) => { const t0 = performance.now(); const step = (t) => { const k = Math.min(1, (t - t0) / ms); fn(ease(k)); if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
  const setFan = (f) => FAN.forEach((g, i) => g.setAttribute('transform', `rotate(${ANG[i] * f})`));
  async function flipPile(toBack) {
    await tween(170, (e) => CARDS_G.setAttribute('transform', `translate(262 222) scale(${Math.max(0.001, 1 - e)} 1)`));
    PILE_BACK.setAttribute('opacity', toBack ? '1' : '0');
    await tween(170, (e) => CARDS_G.setAttribute('transform', `translate(262 222) scale(${Math.max(0.001, e)} 1)`));
  }
  function resetP1Art() { setFan(1); PILE_BACK.setAttribute('opacity', '0'); CARDS_G.setAttribute('transform', 'translate(262 222)'); }
  const pilePoint = () => { const r = PILE_BACK.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  async function spiderIntro() { await tween(430, (e) => setFan(1 - e)); await flipPile(true); }
  function spiderOutro() {
    if (window.HA_spiderGather) window.HA_spiderGather(pilePoint());
    setTimeout(async () => { await flipPile(false); await tween(380, (e) => setFan(e)); }, 680);
  }

  /* panel 2: frame the acquirer so his face sits clear of the dialogue (upper third on phones, left half on desktop) */
  function frameFace(p) {
    const btn = $('.panel-btn', p), w = btn.clientWidth, h = btn.clientHeight;
    const k = Math.max(w / 400, h / 300), ox = w - 400 * k, oy = (h - 300 * k) / 2; // xMaxYMid slice
    const F = [ox + 325 * k, oy + 176.5 * k]; // the acquirer's face in the art (exec symbol at 268,110 · 114×190)
    const sheet = p.classList.contains('sheet-mode');
    const s = sheet ? 1.3 : 1.25;
    const T = sheet ? [w * 0.5, Math.max(178, h * 0.27)] : [w * 0.27, h * 0.4];
    p.style.setProperty('--ztx', (T[0] - F[0] * s).toFixed(1) + 'px');
    p.style.setProperty('--zty', (T[1] - F[1] * s).toFixed(1) + 'px');
    p.style.setProperty('--zs', s);
    p._face = { x: T[0] - 31 * k * s, y: T[1] - 40 * k * s, w: 62 * k * s, h: 76 * k * s };
  }
  window.HA_faceBox = () => {
    const p = $('#panel-2'); if (!p._face || !p.classList.contains('open')) return null;
    const r = $('.panel-btn', p).getBoundingClientRect();
    return { left: r.left + p._face.x, top: r.top + p._face.y, right: r.left + p._face.x + p._face.w, bottom: r.top + p._face.y + p._face.h };
  };

  function open(p, { focus = true, fromHistory = false } = {}) {
    if (openP === p) return;
    if (p.classList.contains('closing')) finalize(p, false);
    const switching = !!openP;
    if (openP) shut(openP, false);
    clearTimeout(closeT); clearTimeout(introT);
    const first = p.getBoundingClientRect();
    const btn = $('.panel-btn', p), pq = $('.pq', p), svg = $('.panel-btn svg', p), card = p.dataset.card;
    if (isSheet()) {
      p._ph = document.createElement('div');
      p._ph.className = 'panel-ph'; p._ph.style.height = first.height + 'px';
      p.before(p._ph);
      p._bd = document.createElement('div'); p._bd.className = 'panel-backdrop';
      p._bd.addEventListener('click', () => { if (openP === p) close(p, false); });
      document.body.appendChild(p._bd);
      p.classList.add('sheet-mode');
      document.documentElement.classList.add('pq-lock');
    }
    svg.setAttribute('preserveAspectRatio', ({ nat20: 'xMaxYMid slice', sniped: 'xMaxYMid slice', certified: 'xMaxYMid slice' })[card] || 'xMidYMid slice');
    p.classList.add('open'); pq.hidden = false; btn.setAttribute('aria-expanded', 'true'); btn.tabIndex = -1;
    openP = p;
    markTouched(+p.dataset.p);
    if (!fromHistory) {
      const st = { haPanel: +p.dataset.p };
      if (switching && panelState()) history.replaceState(st, '', '#panel-' + p.dataset.p);
      else history.pushState(st, '', '#panel-' + p.dataset.p);
    }
    if (card === 'nat20') frameFace(p);
    flipFrom(p, first);
    if (card === 'studio') studio.init();
    if (card === 'selfie' && HA.booth) HA.booth.idle();
    if (reduced) { p.classList.add('live'); onLive(p); }
    else {
      p.classList.add('intro');
      if (card === 'spider') spiderIntro();
      introT = setTimeout(() => { p.classList.remove('intro'); p.classList.add('live'); onLive(p); }, INTRO[card] || 900);
    }
    if (!isSheet()) setTimeout(() => p.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }), reduced ? 0 : 60);
    else p.scrollTop = 0;
    if (focus) { pq.setAttribute('tabindex', '-1'); setTimeout(() => pq.focus({ preventScroll: true }), reduced ? 0 : (INTRO[card] || 900) + 50); }
  }
  function onLive(p) {
    if (p.dataset.card === 'spider' && window.HA_spiderDeal) window.HA_spiderDeal(reduced ? null : pilePoint());
  }
  // shut = the (animated) visual close; close = shut + keep history consistent
  function shut(p, focus = true, instant = false) {
    if (!p || openP !== p) return;
    clearTimeout(closeT); clearTimeout(introT);
    openP = null;
    refresh(); // the collapsed art for (b)/(c) cross-fades in while the panel closes
    const vid = $('.st-vid', p); if (vid) vid.pause();
    if (p.dataset.card === 'selfie' && HA.booth) HA.booth.stop();
    if (reduced || instant) { finalize(p, focus); return; }
    p.classList.add('closing'); p.classList.remove('live'); p.classList.add('intro');
    if (p._bd) p._bd.classList.add('fading');
    if (p.dataset.card === 'spider') spiderOutro();
    const ms = OUT_MS[p.dataset.card] || 850;
    p._t1 = setTimeout(() => p.classList.remove('intro'), Math.round(ms * 0.42));
    p._t2 = setTimeout(() => finalize(p, focus), ms);
  }
  function finalize(p, focus) {
    clearTimeout(p._t1); clearTimeout(p._t2);
    if (!p.classList.contains('open')) return;
    const first = p.getBoundingClientRect();
    const btn = $('.panel-btn', p), pq = $('.pq', p);
    p.classList.remove('open', 'sheet-mode', 'done-flash', 'intro', 'live', 'gavel', 'closing');
    $('.panel-btn svg', p).removeAttribute('preserveAspectRatio');
    pq.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.removeAttribute('tabindex');
    if (p._ph) { p._ph.remove(); p._ph = null; }
    if (p._bd) { p._bd.remove(); p._bd = null; }
    if (!openP) document.documentElement.classList.remove('pq-lock');
    if (p === P1) resetP1Art();
    if (focus) { btn.focus({ preventScroll: true }); if (!isSheet()) p.scrollIntoView({ block: 'nearest' }); }
    flipFrom(p, first, 380);
  }
  function close(p, focus = true) {
    if (!p || openP !== p) return;
    shut(p, focus);
    if (panelState()) { popIgnore = true; history.back(); } // drop our #panel entry so one Back still leaves the page
  }
  function skip(p) {
    const i = panels.indexOf(p);
    const next = panels.slice(i + 1).concat(panels.slice(0, i)).find((x) => !has(x.dataset.card)) || panels[(i + 1) % panels.length];
    if (next === p) { close(p); return; }
    next.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    open(next); // replaces the history entry: still one Back to leave
  }
  addEventListener('popstate', () => {
    if (popIgnore) { popIgnore = false; return; }
    const n = panelState();
    const typed = !n && /^#panel-([1-7])$/.exec(location.hash);
    if (n) { const p = panels.find((x) => +x.dataset.p === n); if (p && openP !== p) open(p, { fromHistory: true }); }
    else if (typed) { history.replaceState(null, '', cleanURL()); window.HA_openPanel(+typed[1]); }
    else if (openP) shut(openP);
  });
  panels.forEach((p) => {
    $('.panel-btn', p).addEventListener('click', () => { if (openP !== p) open(p); });
    $('.pq-x', p).addEventListener('click', () => close(p));
    $('.pq-skip', p).addEventListener('click', () => skip(p));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !openP || document.querySelector('dialog[open]')) return;
    if (document.querySelector('[popover]:popover-open#contactPop')) return;
    e.preventDefault(); close(openP);
  });
  let downInside = true;
  document.addEventListener('pointerdown', (e) => { downInside = !openP || openP.contains(e.target) || !!e.target.closest('dialog, [popover], .dock, .pack, .panel-backdrop'); }, true);
  document.addEventListener('click', (e) => {
    if (!openP || downInside) return;
    if (openP.contains(e.target) || e.target.closest('dialog, [popover], .dock, .pack, .panel-btn, .panel-backdrop')) return;
    close(openP, false);
  });
  window.HA_openPanel = (n) => {
    const p = panels.find((x) => x.dataset.p === String(n)); if (!p) return;
    p.scrollIntoView({ behavior: 'auto', block: 'start' });
    setTimeout(() => open(p), 50);
  };
  const deep = /^#panel-([1-7])$/.exec(location.hash);
  if (deep) { history.replaceState(null, '', cleanURL()); setTimeout(() => window.HA_openPanel(+deep[1]), 400); }
  document.addEventListener('ha:gavel', () => { const p = $('#panel-7'); p.classList.remove('gavel'); void p.offsetWidth; p.classList.add('gavel'); });

  /* ---------- a quest's card landed → ✓ played, collapse ---------- */
  document.addEventListener('ha:earned', (e) => {
    const id = e.detail && e.detail.id;
    const p = panels.find((x) => x.dataset.card === id);
    refresh();
    if (!p) return;
    p.classList.add('done-flash');
    const ms = AUTO_CLOSE[id];
    if (openP === p && ms != null) closeT = setTimeout(() => { if (openP === p && !document.querySelector('#winDlg[open]')) close(p); else if (openP === p) closeT = setTimeout(() => close(p), 2500); }, reduced ? Math.min(ms, 1200) : ms);
  });

  /* ---------- panels pop in as they scroll into view ---------- */
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: 0.15 });
    panels.forEach((p) => io.observe(p));
  } else panels.forEach((p) => p.classList.add('in'));

  /* =================================================================
     Panel 4: a small chart of Browsea's works. 3 islands explored → Studio Tour.
     Media is Adam's own browsea.surf clips; the ?v= stamps come from browsea.surf/media/versions.json
     (copied here because that file is not served with CORS headers).
     ================================================================= */
  const MEDIA = 'https://browsea.surf/media/';
  const V = { 'meatybee.jpg': 'tmae6p', 'meatybee.mp4': 'tmae6p', 'comic-pipeline-explainer.jpg': 'tm9964', 'comic-pipeline-explainer.mp4': 'tm9939', 'stoody.jpg': 'tmae0n', 'stoody.mp4': 'tmae0n', 'formwise-concept.jpg': 'tm9b0t', 'formwise-concept.mp4': 'tm9ay5', 'gm-toolkit-tour.jpg': 'tm9a64', 'gm-toolkit-tour.mp4': 'tm9a2n', 'auction-assistant-tour.jpg': 'tm9bhy', 'auction-assistant-tour.mp4': 'tm9bf0', 'eink-browser-concept.jpg': 'tm97cq', 'eink-browser-concept.mp4': 'tm97bf' };
  const url = (clip, ext) => MEDIA + clip + '.' + ext + (V[clip + '.' + ext] ? '?v=' + V[clip + '.' + ext] : '');
  const BLOB = {
    A: 'M-70,-8 C-66,-40 -28,-58 8,-50 C44,-44 74,-22 72,6 C70,34 40,52 6,50 C-30,48 -74,26 -70,-8Z',
    B: 'M-55,-25 C-40,-52 10,-60 40,-42 C66,-26 70,10 50,32 C30,54 -12,56 -40,40 C-66,24 -68,-4 -55,-25Z',
    C: 'M-80,0 C-78,-30 -40,-44 -6,-40 C20,-54 62,-44 74,-16 C86,12 60,40 26,42 C-4,54 -52,48 -70,28 C-82,18 -82,8 -80,0Z',
  };
  const ISLES = [
    { id: 'delivery', n: 1, name: 'Project Delivery', short: 'Delivery', x: 785, y: 330, blob: 'C', rot: -8, s: 0.74, hex: '#0f6e7a', t: 'Meatybee platform', clip: 'meatybee', d: 'About fifty mini-apps on one shell, one command layer and one database, run as one program with written standards.' },
    { id: 'ai', n: 2, name: 'AI Pipelines', short: 'AI', x: 110, y: 150, blob: 'A', rot: 12, s: 0.72, hex: '#a72d6a', t: 'Comic-to-animation pipeline', clip: 'comic-pipeline-explainer', d: 'Turns comic pages into Unity assets and voiced scenes. Delivered two short visual novels and an animation prototype.' },
    { id: 'learning', n: 3, name: 'Learning Tools', short: 'Learning', x: 905, y: 150, blob: 'B', rot: 0, s: 0.72, hex: '#2f6db0', t: 'Stoody', clip: 'stoody', d: 'A study platform for professional exams with an answer-key audit of 1,414 practice questions. The PMP prep tool.' },
    { id: 'docs', n: 4, name: 'Documents & Forms', short: 'Docs', x: 515, y: 330, blob: 'B', rot: 30, s: 0.68, hex: '#8a5a12', t: 'Formwise', clip: 'formwise-concept', d: 'Explains and fills long forms, with personal data tokenised before any language model sees it. One of three winners, UH AI competition 2025.' },
    { id: 'games', n: 5, name: 'Games & Interactive', short: 'Games', x: 245, y: 330, blob: 'C', rot: 170, s: 0.72, hex: '#5b4bb0', t: 'Game-master toolkit', clip: 'gm-toolkit-tour', d: 'Runs tabletop campaigns from one tool: a rules database, characters and factions, and dice checks resolved by the book.' },
    { id: 'ops', n: 6, name: 'Automation & Ops', short: 'Ops', x: 650, y: 150, blob: 'A', rot: -20, s: 0.66, hex: '#2e7d4f', t: 'Budgeted auction assistant', clip: 'auction-assistant-tour', d: 'Splits a fixed monthly budget across wanted items and bids at the last second, never above a price cap.' },
    { id: 'rnd', n: 7, name: 'R&D and Concepts', short: 'R&D', x: 380, y: 150, blob: 'A', rot: 60, s: 0.66, hex: '#6b6b6b', t: 'E-ink reading browser', clip: 'eink-browser-concept', d: 'A browser build for an e-ink tablet that connects to the studio’s catalog and study apps. Planned.' },
  ];
  const studio = (() => {
    const mount = $('#studioMount');
    let ready = false;
    const seen = new Set();
    let ship = { x: 500, y: 250 };
    function init() {
      if (ready || !mount) return;
      ready = true;
      mount.innerHTML = `
        <h3 class="sr-only">Chart of works</h3>
        <div class="cspeak"><svg class="cfig" viewBox="0 0 120 200" aria-hidden="true"><use href="#pm"/></svg><p class="cbub">Pick an island. I’ll sail us there.</p></div>
        <svg class="st-map" viewBox="0 0 1000 470" role="group" aria-label="Map of Browsea’s seven areas">
          <path class="st-route" id="stRoute" d=""/>
          ${ISLES.map((i) => `<g class="isle" data-id="${i.id}" role="button" tabindex="0" aria-label="Island ${i.n}: ${i.name}" transform="translate(${i.x} ${i.y})">
            <ellipse class="isle-surf" rx="${78 * i.s * 1.25}" ry="${40 * i.s * 1.25}" cy="8"/>
            <path d="${BLOB[i.blob]}" transform="rotate(${i.rot}) scale(${i.s * 1.25})" fill="${i.hex}" stroke="#000" stroke-width="5"/>
            <circle class="isle-n" cx="0" cy="-6" r="20" fill="#fff" stroke="#000" stroke-width="3"/><text class="isle-nt" y="2" text-anchor="middle">${i.n}</text>
            <text class="isle-l" y="92" text-anchor="middle">${i.short}</text>
            <text class="isle-tick" x="34" y="-30" text-anchor="middle" aria-hidden="true">✓</text>
          </g>`).join('')}
          <g class="st-ship" id="stShip" aria-hidden="true"><path d="M-34 0h68l-12 18h-44Z" fill="#8a5a2b" stroke="#000" stroke-width="4"/><path d="M0 0v-52" stroke="#000" stroke-width="4"/><path d="M2-50 32-10H2Z" fill="#fff" stroke="#000" stroke-width="3"/><path d="M-2-46-26-14h24Z" fill="#ffd60a" stroke="#000" stroke-width="3"/></g>
        </svg>
        <div class="st-info" id="stInfo" aria-live="polite"></div>
        <div class="st-foot"><p class="ccap st-count" id="stCount">Charted 0/3 islands</p>
        <a class="st-open" href="https://browsea.surf" target="_blank" rel="noopener"><span>Open the full studio →</span><small>browsea.surf</small></a></div>`;
      ship = { x: 500, y: 250 };
      $('#stShip').style.transform = `translate(${ship.x}px, ${ship.y}px)`;
      $$('.isle', mount).forEach((g) => {
        g.addEventListener('click', () => show(g.dataset.id));
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(g.dataset.id); } });
      });
    }
    function show(id) {
      const i = ISLES.find((x) => x.id === id);
      $$('.isle', mount).forEach((g) => g.classList.toggle('sel', g.dataset.id === id));
      $(`.isle[data-id="${id}"]`, mount).classList.add('seen');
      // the ship sails to the island along a dotted route
      const to = { x: i.x + (i.x > 500 ? -95 : 95), y: i.y + 46 };
      $('#stRoute').setAttribute('d', `M${ship.x} ${ship.y} Q${(ship.x + to.x) / 2} ${Math.min(ship.y, to.y) - 70} ${to.x} ${to.y}`);
      const sh = $('#stShip'); sh.style.transform = `translate(${to.x}px, ${to.y}px) scaleX(${to.x < ship.x ? -1 : 1})`;
      ship = to;
      const info = $('#stInfo');
      info.innerHTML = `<div class="st-card postcard">
          <video class="st-vid" muted loop playsinline preload="none" ${reduced ? 'controls' : 'autoplay'} poster="${url(i.clip, 'jpg')}" style="background: #0b4d58 url('${url(i.clip, 'jpg')}') center / cover no-repeat" aria-label="Clip: ${i.t}"></video>
          <div class="st-tx"><p class="st-area" style="--c:${i.hex}">Island ${i.n} · ${i.name}</p><h4>${i.t}</h4><p>${i.d}</p></div>
        </div>`;
      const v = $('video', info);
      v.src = url(i.clip, 'mp4');
      if (!reduced) v.play().catch(() => {});
      seen.add(id);
      $('#stCount').textContent = seen.size >= 3 ? `Charted ${seen.size}/7 islands · Studio Tour earned` : `Charted ${seen.size}/3 islands`;
      if (seen.size === 3 && !has('studio')) { Q.earn('studio'); toast('Studio Tour. The full chart is on browsea.surf.'); }
    }
    return { init };
  })();

  refresh();
})();
