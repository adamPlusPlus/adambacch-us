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

  /* ================================================================
     The camera (every panel except E3). The art keeps its own aspect ("meet") and a camera transform
     moves it: it starts exactly where the collapsed panel showed it and glides onto the object that
     becomes the activity. The panel itself grows with a clip-path (no squashing), the activity arrives
     while the camera is still moving, and closing runs the same steps backwards.
     ================================================================ */
  const CAM_MS = reduced ? 0 : 480;
  // B = the art box to frame (viewBox units) · S = where it lands in the open panel · uiTop/uiLeft = where the activity sits
  function camLayout(card, w, h, sheet) {
    const full = (B) => ({ B });
    switch (card) {
      case 'spider': return sheet ? { B: { x: 8, y: 58, w: 352, h: 242 }, S: { x: 8, y: 46, w: w - 16, h: Math.min(250, h * 0.34) }, uiTop: Math.min(250, h * 0.34) + 50 }
        : { B: { x: 8, y: 58, w: 352, h: 242 }, S: { x: 16, y: 44, w: w - 32, h: 300 }, uiTop: 350 };
      case 'wip': return sheet ? { B: { x: 82, y: 6, w: 248, h: 294 }, S: { x: w * 0.08, y: h - 340, w: w * 0.84, h: 330 }, uiTop: 50, uiBottom: 350 }
        : { B: { x: 82, y: 6, w: 248, h: 294 }, S: { x: 8, y: 44, w: w * 0.38, h: h - 60 }, uiTop: 50, uiLeft: w * 0.4 };
      case 'studio': return sheet ? { B: { x: 198, y: 34, w: 202, h: 232 }, S: { x: 6, y: 46, w: w - 12, h: Math.min(380, h * 0.5) }, uiTop: Math.min(380, h * 0.5) + 50 }
        : { B: { x: 198, y: 34, w: 202, h: 232 }, S: { x: 16, y: 44, w: w - 32, h: 380 }, uiTop: 430 };
      case 'certified': return sheet ? { B: { x: 204, y: 42, w: 192, h: 142 }, S: { x: 12, y: 70, w: w - 24, h: 300 }, uiTop: 50 }
        : { B: { x: 204, y: 42, w: 192, h: 142 }, S: { x: w * 0.18, y: 60, w: w * 0.64, h: 320 }, uiTop: 50 };
      case 'selfie': return sheet ? { B: { x: 0, y: 8, w: 400, h: 292 }, S: { x: 0, y: 46, w: w, h: Math.min(300, h * 0.4) }, uiTop: Math.min(300, h * 0.4) + 50 }
        : { B: { x: 0, y: 8, w: 400, h: 292 }, S: { x: 8, y: 44, w: w * 0.5, h: Math.min(h - 70, 420) }, uiTop: 50, uiLeft: w * 0.52 };
      case 'sniped': return sheet ? { B: { x: 0, y: 8, w: 400, h: 292 }, S: { x: 0, y: 46, w: w, h: Math.min(290, h * 0.38) }, uiTop: Math.min(290, h * 0.38) + 50 }
        : { B: { x: 0, y: 8, w: 400, h: 292 }, S: { x: 8, y: 44, w: w * 0.5, h: Math.min(h - 70, 420) }, uiTop: 50, uiLeft: w * 0.52 };
      default: return full({ x: 0, y: 0, w: 400, h: 300 });
    }
  }
  function camGeom(p) {
    const btn = $('.panel-btn', p), w = btn.clientWidth, h = btn.clientHeight;
    const k = Math.min(w / 400, h / 300), ox = (w - 400 * k) / 2, oy = (h - 300 * k) / 2;
    return { btn, w, h, k, ox, oy, bR: btn.getBoundingClientRect() };
  }
  const setCam = (p, t) => { p.style.setProperty('--cx', t.x.toFixed(1) + 'px'); p.style.setProperty('--cy', t.y.toFixed(1) + 'px'); p.style.setProperty('--cs', t.s.toFixed(4)); };
  // panel-local → screen, for an art point under the target camera
  const artToScreen = (p, vx, vy) => { const g = p._geo, t = p._cam1; return { x: g.bR.left + t.x + t.s * (g.ox + g.k * vx), y: g.bR.top + t.y + t.s * (g.oy + g.k * vy) }; };
  const artRect = (p, x, y, w, h) => { const a = artToScreen(p, x, y), b = artToScreen(p, x + w, y + h); return { left: a.x, top: a.y, width: b.x - a.x, height: b.y - a.y }; };
  const fromRect = (el, r, extra = '') => { const e = el.getBoundingClientRect(); const sx = r.width / e.width, sy = r.height / e.height; return `translate(${r.left - e.left}px, ${r.top - e.top}px) scale(${sx.toFixed(3)}, ${sy.toFixed(3)}) ${extra}`; };

  /* the characters speak inside their own art bubbles (two lines; long lines shrink to fit) */
  const BUB = { 1: 20, 3: 24, 6: 19, 7: 21 };
  function say(p, text) {
    const n = +p.dataset.p, max = BUB[n]; if (!max) return;
    const tx = $$('.panel-btn svg > g.bubble text', p); if (tx.length < 2) return;
    if (!p._bub) p._bub = tx.map((t) => t.textContent);
    const words = String(text).trim().split(/\s+/);
    let per = max, lines;
    for (;;) { lines = ['']; words.forEach((wd) => { const L = lines[lines.length - 1]; if (L && (L + ' ' + wd).length > per) lines.push(wd); else lines[lines.length - 1] = L ? L + ' ' + wd : wd; }); if (lines.length <= 2 || per > 60) break; per += 3; }
    tx[0].textContent = lines[0] || ''; tx[1].textContent = lines.slice(1).join(' ');
    const fs = Math.max(9, Math.round(17 * Math.min(1, max / per)));
    tx.forEach((t) => { t.style.fontSize = fs + 'px'; });
  }
  function unsay(p) {
    const tx = $$('.panel-btn svg > g.bubble text', p);
    if (p._bub) tx.forEach((t, i) => { t.textContent = p._bub[i]; t.style.fontSize = ''; });
    p._bub = null;
    if (company) { const t = $('#panel-6 .b-co'); if (t && p.id === 'panel-6') t.textContent = `Nice to meet you, ${company}.`; }
  }
  const short7 = (m) => (m.length <= 42 ? m : /Plot twist/.test(m) ? 'Plot twist… you won!' : /Sniped/.test(m) ? 'Sniped at 0:01!' : /closed/i.test(m) ? 'Sold!' : m.split(/[.!?]/)[0].slice(0, 42));
  // mirror the quest's own (accessible) message into the art bubble
  [['#spSay', 1, (m) => m], ['#wipMsg', 3, (m) => m], ['#aucMsg', 7, short7]].forEach(([sel, n, f]) => {
    const el = $(sel), p = $('#panel-' + n); if (!el || !p) return;
    new MutationObserver(() => { if (p.classList.contains('live')) say(p, f(el.textContent.trim())); }).observe(el, { childList: true, characterData: true, subtree: true });
  });

  // centre-to-centre transform from an element's box to a target box, with a 3D turn (the element flips about its middle)
  const towards = (el, r, deg) => {
    const e = el.getBoundingClientRect();
    const dx = (r.left + r.width / 2) - (e.left + e.width / 2), dy = (r.top + r.height / 2) - (e.top + e.height / 2);
    return `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) perspective(1100px) rotateY(${deg}deg) scale(${(r.width / e.width).toFixed(3)}, ${(r.height / e.height).toFixed(3)})`;
  };
  // panel 5: one card, the certificate on its front face and the exam paper on its back face
  function ensureFlip(p) {
    let wrap = $('.flip3d', p);
    if (wrap) return wrap;
    const paper = $('.pmp-q', p);
    wrap = document.createElement('div'); wrap.className = 'flip3d';
    paper.before(wrap);
    const back = document.createElement('div'); back.className = 'f-back'; back.appendChild(paper);
    const front = document.createElement('div'); front.className = 'f-front'; front.setAttribute('aria-hidden', 'true');
    front.innerHTML = '<svg viewBox="206 44 188 136" preserveAspectRatio="none" width="100%" height="100%"></svg>';
    const cert = $('.panel-btn svg .fx-sign', p).cloneNode(true); cert.setAttribute('class', 'cert-face');
    front.firstChild.appendChild(cert);
    wrap.append(back, front);
    return wrap;
  }

  /* per-panel morphs: the object in the art becomes the activity */
  const MORPH = {
    spider: {
      open(p) { p.classList.add('predeal'); spiderIntro(); setTimeout(() => { if (openP !== p) return; p.classList.remove('predeal'); if (window.HA_spiderDeal) window.HA_spiderDeal(reduced ? null : pilePoint()); p._dealT = setTimeout(() => p.classList.add('dealt'), reduced ? 0 : 12 * 75 + 120); }, reduced ? 0 : 800); say(p, 'Build King down to Ace.'); },
      close(p) { clearTimeout(p._dealT); p.classList.remove('dealt'); if (window.HA_spiderGather) window.HA_spiderGather(pilePoint()); setTimeout(async () => { await flipPile(false); await tween(320, (e) => setFan(e)); }, 460); return 1150; },
    },
    wip: {
      open(p) { say(p, $('#wipMsg').textContent.trim() || 'Pick the one task worth doing.'); if (!reduced) $('#kbBoard').animate([{ transform: 'translateY(-60px) rotate(-2deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 460, delay: 120, easing: 'cubic-bezier(.2,.9,.3,1.15)', fill: 'backwards' }); },
      close(p) { if (!reduced) $('#kbBoard').animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-60px) rotate(-2deg)', opacity: 0 }], { duration: 260, easing: 'ease-in', fill: 'forwards' }); return 240; },
    },
    studio: { open() {}, close() { return 200; } },
    certified: {
      open(p) {
        const wrap = ensureFlip(p);
        if (reduced) { p.classList.add('lifted'); return; }
        p._flipT = setTimeout(() => {
          if (openP !== p) return;
          p.classList.add('lifted');
          wrap.animate([{ transform: towards(wrap, artRect(p, 206, 44, 188, 136), 180) }, { transform: 'perspective(1100px) rotateY(0deg)' }], { duration: 460, easing: 'cubic-bezier(.3,.7,.25,1)' });
        }, 480);
      },
      close(p) {
        clearTimeout(p._flipT);
        const wrap = $('.flip3d', p);
        if (reduced || !wrap || !p.classList.contains('lifted')) { p.classList.remove('lifted'); return 0; }
        const a = wrap.animate([{ transform: 'perspective(1100px) rotateY(0deg)' }, { transform: towards(wrap, artRect(p, 206, 44, 188, 136), 180) }], { duration: 420, easing: 'cubic-bezier(.5,0,.6,.4)', fill: 'forwards' });
        a.onfinish = () => { p.classList.remove('lifted'); a.cancel(); };
        return 430;
      },
    },
    selfie: {
      open(p) { say(p, 'Squeeze in!'); if (reduced) return; const bo = $('.booth', p); bo.animate([{ transform: fromRect(bo, artRect(p, 296, 190, 50, 50), 'rotate(-20deg)'), transformOrigin: 'top left', opacity: 0.4 }, { transform: 'none', transformOrigin: 'top left', opacity: 1 }], { duration: 480, delay: 200, easing: 'cubic-bezier(.2,.9,.3,1.1)', fill: 'backwards' }); },
      close(p) { if (reduced) return 0; const bo = $('.booth', p); bo.animate([{ transform: 'none', transformOrigin: 'top left' }, { transform: fromRect(bo, artRect(p, 296, 190, 50, 50), 'rotate(-20deg)'), transformOrigin: 'top left', opacity: 0 }], { duration: 300, easing: 'ease-in', fill: 'forwards' }); return 300; },
    },
    sniped: {
      open(p) { say(p, short7($('#aucMsg').textContent.trim())); if (reduced) return; const lb = $('.lot-body', p), pod = artRect(p, 218, 250, 148, 50); lb.animate([{ transform: fromRect(lb, { left: pod.left, top: pod.top, width: pod.width, height: Math.max(4, pod.height * 0.2) }), transformOrigin: 'top left', opacity: 0.5 }, { transform: 'none', transformOrigin: 'top left', opacity: 1 }], { duration: 460, delay: 200, easing: 'cubic-bezier(.2,.9,.3,1.1)', fill: 'backwards' }); },
      close(p) { p.classList.remove('gavel'); void p.offsetWidth; p.classList.add('gavel'); if (reduced) return 0; const lb = $('.lot-body', p), pod = artRect(p, 218, 250, 148, 50); lb.animate([{ transform: 'none', transformOrigin: 'top left' }, { transform: fromRect(lb, { left: pod.left, top: pod.top, width: pod.width, height: Math.max(4, pod.height * 0.2) }), transformOrigin: 'top left', opacity: 0 }], { duration: 300, easing: 'ease-in', fill: 'forwards' }); return 420; },
    },
  };

  function camOpen(p, pr0, r0) {
    const card = p.dataset.card, svg = $('.panel-btn svg', p);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    p.classList.add('cam', 'cam-start');
    const sheet = p.classList.contains('sheet-mode');
    let g = camGeom(p);
    const L = camLayout(card, g.w, g.h, sheet);
    p.style.setProperty('--uiTop', L.uiTop + 'px');
    p.style.setProperty('--uiLeft', (L.uiLeft || 0) + 'px');
    p.style.setProperty('--uiBottom', (L.uiBottom || 0) + 'px');
    g = camGeom(p); p._geo = g;
    const P = p.getBoundingClientRect();
    const s0 = r0.width / (400 * g.k);
    const t0 = { x: r0.left - g.bR.left - s0 * g.ox, y: r0.top - g.bR.top - s0 * g.oy, s: s0 };
    const s1 = Math.min(L.S.w / (L.B.w * g.k), L.S.h / (L.B.h * g.k));
    const t1 = { x: L.S.x + L.S.w / 2 - s1 * (g.ox + g.k * (L.B.x + L.B.w / 2)), y: L.S.y + L.S.h / 2 - s1 * (g.oy + g.k * (L.B.y + L.B.h / 2)), s: s1 };
    const clip0 = `inset(${(pr0.top - P.top).toFixed(1)}px ${(P.right - pr0.right).toFixed(1)}px ${(P.bottom - pr0.bottom).toFixed(1)}px ${(pr0.left - P.left).toFixed(1)}px round 6px)`;
    p._cam0 = t0; p._cam1 = t1; p._clip0 = clip0;
    if (reduced) { setCam(p, t1); p.classList.remove('cam-start'); p.classList.add('live'); MORPH[card].open(p); return; }
    setCam(p, t0); p.style.clipPath = clip0;
    void p.offsetWidth;
    p.classList.remove('cam-start');
    setCam(p, t1); p.style.clipPath = 'inset(0px 0px 0px 0px round 6px)';
    introT = setTimeout(() => { if (openP === p) p.classList.add('live'); }, 220);
    MORPH[card].open(p);
    p._clipT = setTimeout(() => { if (p.classList.contains('open') && !p.classList.contains('closing')) p.style.clipPath = ''; }, CAM_MS + 60);
  }
  function camClose(p, focus) {
    const card = p.dataset.card;
    clearTimeout(p._clipT);
    p.classList.add('closing'); p.classList.remove('live');
    if (p._bd) p._bd.classList.add('fading');
    const wait = MORPH[card].close(p) || 0;
    p._t1 = setTimeout(() => {
      // the camera pulls back to exactly where the collapsed panel will show the art
      let t0 = p._cam0, clip0 = p._clip0;
      if (p._ph) {
        const P = p.getBoundingClientRect(), pr = p._ph.getBoundingClientRect(), g = camGeom(p);
        const iw = pr.width - 8, s0 = iw / (400 * g.k);
        t0 = { x: pr.left + 4 - g.bR.left - s0 * g.ox, y: pr.top + 4 - g.bR.top - s0 * g.oy, s: s0 };
        clip0 = `inset(${(pr.top - P.top).toFixed(1)}px ${(P.right - pr.right).toFixed(1)}px ${(P.bottom - pr.bottom).toFixed(1)}px ${(pr.left - P.left).toFixed(1)}px round 6px)`;
      }
      p.style.clipPath = 'inset(0px 0px 0px 0px round 6px)'; void p.offsetWidth;
      setCam(p, t0); p.style.clipPath = clip0;
      p._t2 = setTimeout(() => finalize(p, focus), CAM_MS + 30);
    }, wait);
  }

  function open(p, { focus = true, fromHistory = false } = {}) {
    if (openP === p) return;
    if (p.classList.contains('closing')) finalize(p, false);
    const switching = !!openP;
    if (openP) shut(openP, false);
    clearTimeout(closeT); clearTimeout(introT);
    const first = p.getBoundingClientRect();
    const btn = $('.panel-btn', p), pq = $('.pq', p), svg = $('.panel-btn svg', p), card = p.dataset.card;
    const r0 = svg.getBoundingClientRect();
    const isCam = card !== 'nat20';
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
    if (!isCam) svg.setAttribute('preserveAspectRatio', 'xMaxYMid slice');
    p.classList.add('open'); pq.hidden = false; btn.setAttribute('aria-expanded', 'true'); btn.tabIndex = -1;
    openP = p;
    markTouched(+p.dataset.p);
    if (window.bm) bm('panel', p.dataset.p);
    if (!fromHistory) {
      const st = { haPanel: +p.dataset.p };
      if (switching && panelState()) history.replaceState(st, '', '#panel-' + p.dataset.p);
      else history.pushState(st, '', '#panel-' + p.dataset.p);
    }
    if (card === 'studio') studio.init();
    if (card === 'selfie' && HA.booth) HA.booth.idle();
    if (isCam) camOpen(p, first, r0);
    else {
      frameFace(p);
      flipFrom(p, first);
      if (reduced) { p.classList.add('live'); onLive(p); }
      else { p.classList.add('intro'); introT = setTimeout(() => { p.classList.remove('intro'); p.classList.add('live'); onLive(p); }, INTRO[card] || 900); }
    }
    if (!isSheet()) setTimeout(() => p.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }), reduced ? 0 : 60);
    else p.scrollTop = 0;
    const ready = isCam ? 650 : (INTRO[card] || 900) + 50;
    if (focus) { pq.setAttribute('tabindex', '-1'); setTimeout(() => pq.focus({ preventScroll: true }), reduced ? 0 : ready); }
  }
  function onLive(p) {
    if (p.dataset.card === 'spider' && window.HA_spiderDeal) window.HA_spiderDeal(reduced ? null : pilePoint());
  }
  // shut = the (animated) visual close; close = shut + keep history consistent
  function shut(p, focus = true, instant = false) {
    if (!p || openP !== p) return;
    clearTimeout(closeT); clearTimeout(introT);
    openP = null;
    const vid = $('.st-vid', p); if (vid) vid.pause();
    if (p.dataset.card === 'selfie' && HA.booth) HA.booth.stop();
    if (reduced || instant) { finalize(p, focus); return; }
    if (p.classList.contains('cam')) { camClose(p, focus); return; }
    p.classList.add('closing'); p.classList.remove('live'); p.classList.add('intro');
    if (p._bd) p._bd.classList.add('fading');
    const ms = OUT_MS[p.dataset.card] || 850;
    p._t1 = setTimeout(() => p.classList.remove('intro'), Math.round(ms * 0.42));
    p._t2 = setTimeout(() => finalize(p, focus), ms);
  }
  function finalize(p, focus) {
    clearTimeout(p._t1); clearTimeout(p._t2); clearTimeout(p._clipT); clearTimeout(p._dealT); clearTimeout(p._flipT);
    if (!p.classList.contains('open')) return;
    const wasCam = p.classList.contains('cam');
    const first = p.getBoundingClientRect();
    const btn = $('.panel-btn', p), pq = $('.pq', p);
    p.classList.remove('open', 'sheet-mode', 'done-flash', 'intro', 'live', 'gavel', 'closing', 'cam', 'cam-start', 'predeal', 'dealt', 'flipped', 'lifted');
    ['--cx', '--cy', '--cs', '--uiTop', '--uiLeft', '--uiBottom'].forEach((v) => p.style.removeProperty(v));
    p.style.clipPath = ''; btn.style.transformOrigin = '';
    $$('.pmp-q, .flip3d, .lot-body, .booth, #kbBoard', p).forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
    $('.panel-btn svg', p).removeAttribute('preserveAspectRatio');
    pq.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.removeAttribute('tabindex');
    if (p._ph) { p._ph.remove(); p._ph = null; }
    if (p._bd) { p._bd.remove(); p._bd = null; }
    if (!openP) document.documentElement.classList.remove('pq-lock');
    if (p === P1) resetP1Art();
    unsay(p);
    refresh(); // state art (in progress / completed) swaps in only now, once the panel is collapsed
    if (focus) { btn.focus({ preventScroll: true }); if (!isSheet()) p.scrollIntoView({ block: 'nearest' }); }
    if (!wasCam) flipFrom(p, first, 380);
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
    { id: 'ai', n: 2, name: 'AI Pipelines', short: 'AI', x: 110, y: 150, blob: 'A', rot: 12, s: 0.72, hex: '#b45309', t: 'Comic-to-animation pipeline', clip: 'comic-pipeline-explainer', d: 'Turns comic pages into Unity assets and voiced scenes. Delivered two short visual novels and an animation prototype.' },
    { id: 'learning', n: 3, name: 'Learning Tools', short: 'Learning', x: 905, y: 150, blob: 'B', rot: 0, s: 0.72, hex: '#2f6db0', t: 'Stoody', clip: 'stoody', d: 'A study platform for professional exams with an answer-key audit of 1,414 practice questions. The PMP prep tool.' },
    { id: 'docs', n: 4, name: 'Documents & Forms', short: 'Docs', x: 515, y: 330, blob: 'B', rot: 30, s: 0.68, hex: '#8a5a12', t: 'Formwise', clip: 'formwise-concept', d: 'Explains and fills long forms, with personal data tokenised before any language model sees it. One of three winners, UH AI competition 2025.' },
    { id: 'games', n: 5, name: 'Games & Interactive', short: 'Games', x: 245, y: 330, blob: 'C', rot: 170, s: 0.72, hex: '#5b4bb0', t: 'Game-master toolkit', clip: 'gm-toolkit-tour', d: 'Runs tabletop campaigns from one tool: a rules database, characters and factions, and dice checks resolved by the book.' },
    { id: 'ops', n: 6, name: 'Automation & Ops', short: 'Ops', x: 650, y: 150, blob: 'A', rot: -20, s: 0.66, hex: '#2e7d4f', t: 'Budgeted auction assistant', clip: 'auction-assistant-tour', d: 'Splits a fixed monthly budget across wanted items and bids at the last second, never above a price cap.' },
    { id: 'rnd', n: 7, name: 'R&D and Concepts', short: 'R&D', x: 380, y: 150, blob: 'A', rot: 60, s: 0.66, hex: '#6b6b6b', t: 'E-ink reading browser', clip: 'eink-browser-concept', d: 'A browser build for an e-ink tablet that connects to the studio’s catalog and study apps. Planned.' },
  ];
  // where each area sits on the panel-4 art's own sea (viewBox 400×300)
  const ART_ISLE = {"delivery": [262, 78], "ai": [350, 64], "learning": [372, 148], "docs": [290, 140], "games": [236, 200], "ops": [318, 206], "rnd": [380, 228]};
  const studio = (() => {
    const mount = $('#studioMount'), P4 = $('#panel-4');
    let ready = false, over = null;
    const seen = new Set();
    let ship = { x: 214, y: 258 };
    function init() {
      if (ready || !mount) return;
      ready = true;
      mount.innerHTML = `
        <h3 class="sr-only">Chart of works</h3>
        <p class="ccap st-say">Pick an island. We’ll sail there.</p>
        <div class="st-info" id="stInfo" aria-live="polite"></div>
        <div class="st-foot"><p class="ccap st-count" id="stCount">Charted 0/3 islands</p>
        <a class="st-open" href="https://browsea.surf/?src=adambacch" target="_blank" rel="noopener"><span>Open the full studio →</span><small>browsea.surf</small></a></div>`;
      // an overlay with the art's exact geometry: the islands in the drawing gain numbers and labels in place
      over = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      over.setAttribute('class', 'st-over cam-layer'); over.setAttribute('viewBox', '0 0 400 300'); over.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      over.setAttribute('role', 'group'); over.setAttribute('aria-label', 'Map of Browsea’s seven areas');
      over.innerHTML = `<path class="st-route" id="stRoute" d=""/>` + ISLES.map((i) => { const [x, y] = ART_ISLE[i.id]; return `
        <g class="isle2" data-id="${i.id}" role="button" tabindex="0" aria-label="Island ${i.n}: ${i.name}" transform="translate(${x} ${y})">
          <ellipse class="isle-hit" rx="30" ry="19"/>
          <circle class="isle-n" cx="-15" cy="-11" r="7.5"/><text class="isle-nt" x="-15" y="-8">${i.n}</text>
          <text class="isle-l" y="24">${i.short}</text><text class="isle-tick" x="18" y="-10" aria-hidden="true">✓</text>
        </g>`; }).join('') +
        `<g class="st-ship" id="stShip" aria-hidden="true"><g transform="scale(.32)"><path d="M-34 0h68l-12 18h-44Z" fill="#8a5a2b" stroke="#000" stroke-width="5"/><path d="M0 0v-52" stroke="#000" stroke-width="5"/><path d="M2-50 32-10H2Z" fill="#fff" stroke="#000" stroke-width="4"/><path d="M-2-46-26-14h24Z" fill="#ffd60a" stroke="#000" stroke-width="4"/></g></g>`;
      P4.appendChild(over);
      $('#stShip').style.transform = `translate(${ship.x}px, ${ship.y}px)`;
      $$('.isle2', over).forEach((g) => {
        g.addEventListener('click', () => show(g.dataset.id));
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(g.dataset.id); } });
      });
    }
    function show(id) {
      const i = ISLES.find((x) => x.id === id), [ax, ay] = ART_ISLE[id];
      $$('.isle2', over).forEach((g) => g.classList.toggle('sel', g.dataset.id === id));
      $(`.isle2[data-id="${id}"]`, over).classList.add('seen');
      // the ship sails to the island along a dotted route
      const to = { x: ax - 30, y: ay + 18 };
      $('#stRoute').setAttribute('d', `M${ship.x} ${ship.y} Q${(ship.x + to.x) / 2} ${Math.min(ship.y, to.y) - 30} ${to.x} ${to.y}`);
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
