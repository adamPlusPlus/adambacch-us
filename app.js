/* adambacch.us v2 — "Project: Hire Adam". Zero dependencies. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const EMAIL = 'bacchus.adam@pm.me';
  const PHONE = '(832) 844-7118';
  const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  const MONO = 'ui-monospace, "SF Mono", Consolas, Menlo, monospace';
  const C = { ink: '#0b0a14', paper: '#fbf7ee', green: '#22e07a', pink: '#ff2e88', yellow: '#ffd60a', cyan: '#29d3ff', violet: '#7b5cff', cream: '#fff2b8' };

  /* ---------------- personalization (?c=Acme) ---------------- */
  const params = new URLSearchParams(location.search);
  const clean = (s) => (s || '').normalize('NFKC')
    .replace(/[^\p{L}\p{N} &.,'’()+-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const company = clean(params.get('c') || params.get('company'));
  const sponsorPMO = company ? (/\bPMO$/i.test(company) ? company : company + ' PMO') : '';
  const SITE = 'https://adambacch.us' + (company ? '/?c=' + encodeURIComponent(company) : '');
  const projectLine = 'Project: Hire Adam' + (company ? ' · Sponsor: ' + sponsorPMO : '');

  if (company) {
    $$('[data-sponsor-pmo]').forEach((el) => { el.textContent = sponsorPMO; });
    $$('[data-sponsor-name]').forEach((el) => { el.textContent = company; });
    document.title = projectLine;
  }
  const mailto = (to, subject, body) =>
    'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);

  /* ---------------- helpers ---------------- */
  const toastEl = $('#toast');
  let toastT;
  // The toast is a manual popover so it can sit above open <dialog>s (top layer); re-showing moves it to the top.
  const topLayer = (el) => { if (el.showPopover) { try { if (el.matches(':popover-open')) el.hidePopover(); el.showPopover(); } catch { /* unsupported */ } } };
  function toast(msg) {
    toastEl.textContent = msg;
    topLayer(toastEl);
    toastEl.classList.remove('show');
    requestAnimationFrame(() => toastEl.classList.add('show'));
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('show'), 2800);
  }
  // Quest events: quests.js listens and drops a card into the binder.
  const emit = (id, detail) => document.dispatchEvent(new CustomEvent('ha:quest', { detail: Object.assign({ id }, detail) }));
  async function copy(text, okMsg) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      ta.remove();
    }
    toast(okMsg || 'Copied.');
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  async function shareOrDownload(blob, name, title, text) {
    try {
      const file = new File([blob], name, { type: blob.type });
      if (coarse && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text });
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return; // user closed the share sheet
    }
    download(blob, name);
    toast('Saved ' + name);
  }
  const toBlob = (cv) => new Promise((res) => cv.toBlob(res, 'image/png'));
  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function fit(ctx, text, maxW, size, weight, family) {
    let s = size;
    do { ctx.font = `${weight} ${s}px ${family || FONT}`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 10);
  }
  function drawCover(ctx, img, x, y, w, h, fx = 0.5, fy = 0.5, mirror = false) {
    const iw = img.videoWidth || img.naturalWidth || img.width, ih = img.videoHeight || img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const s = Math.max(w / iw, h / ih), sw = w / s, sh = h / s;
    const sx = (iw - sw) * fx, sy = (ih - sh) * fy;
    ctx.save();
    if (mirror) { ctx.translate(x * 2 + w, 0); ctx.scale(-1, 1); }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();
  }
  const imgs = { adam: loadImg('img/adam.webp'), qr: loadImg('img/qr-adambacchus.svg') };

  /* ---------------- holo card: tilt + flip ---------------- */
  const card = $('#card');
  const cur = { rx: 0, ry: 0, mx: 50, my: 50, hyp: 0 };
  const tgt = { ...cur };
  let mode = 'idle', lastOrient = 0, baseBeta = null, running = false, visible = true, dragEnd = 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function setFromPoint(px, py) { // px,py in 0..1
    px = clamp(px, 0, 1); py = clamp(py, 0, 1);
    tgt.ry = (px - 0.5) * 30; tgt.rx = -(py - 0.5) * 30;
    tgt.mx = px * 100; tgt.my = py * 100;
    tgt.hyp = clamp(Math.hypot(px - 0.5, py - 0.5) * 2.2, 0, 1);
  }
  function frame(t) {
    if (mode === 'orient' && t - lastOrient > 800) mode = 'idle';
    if (mode === 'idle') {
      if (reduced) { Object.assign(tgt, { rx: 0, ry: 0, mx: 50, my: 50, hyp: 0.15 }); }
      else {
        const a = t / 1000;
        setFromPoint(0.5 + Math.sin(a * 0.9) * 0.28, 0.5 + Math.cos(a * 0.7) * 0.2);
        tgt.hyp *= 0.8;
      }
    }
    const k = mode === 'idle' ? 0.06 : 0.18;
    let moving = 0;
    for (const key in cur) { const d = tgt[key] - cur[key]; cur[key] += d * k; moving += Math.abs(d); }
    const s = card.style;
    s.setProperty('--rx', cur.rx.toFixed(2) + 'deg');
    s.setProperty('--ry', cur.ry.toFixed(2) + 'deg');
    s.setProperty('--mx', cur.mx.toFixed(1) + '%');
    s.setProperty('--my', cur.my.toFixed(1) + '%');
    s.setProperty('--hyp', cur.hyp.toFixed(3));
    if (visible && (moving > 0.01 || (mode === 'idle' && !reduced) || mode !== 'idle')) requestAnimationFrame(frame);
    else running = false;
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(card);
  }
  kick();

  let drag = null;
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    if (e.pointerType === 'mouse') {
      mode = 'pointer'; setFromPoint((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); kick();
    } else if (drag) {
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) drag.moved = true;
      if (drag.moved) { mode = 'pointer'; setFromPoint((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); kick(); }
    }
  });
  card.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') drag = { x: e.clientX, y: e.clientY, moved: false }; });
  const endDrag = () => { if (drag && drag.moved) dragEnd = performance.now(); drag = null; mode = 'idle'; kick(); };
  card.addEventListener('pointerup', endDrag);
  card.addEventListener('pointercancel', endDrag);
  card.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { mode = 'idle'; kick(); } });

  card.addEventListener('click', () => {
    if (performance.now() - dragEnd < 350) return; // that was a tilt-drag, not a tap
    const f = card.classList.toggle('flipped');
    card.setAttribute('aria-pressed', String(f));
    if (f) emit('status');
    card.setAttribute('aria-label', f
      ? 'Adam Bacchus status report side. Press to flip back to the card front.'
      : 'Adam Bacchus trading card. Press to flip to the status report side.');
  });

  function onOrient(e) {
    if (e.beta == null || e.gamma == null) return;
    if (mode === 'pointer') return;
    if (baseBeta == null) baseBeta = e.beta;
    const g = clamp(e.gamma, -30, 30) / 30;             // left/right
    const b = clamp(e.beta - baseBeta, -30, 30) / 30;   // toward/away
    lastOrient = performance.now(); mode = 'orient';
    tgt.ry = g * 22; tgt.rx = -b * 22;
    tgt.mx = 50 + g * 50; tgt.my = 50 + b * 50;
    tgt.hyp = clamp(Math.hypot(g, b), 0.2, 1);
    kick();
  }
  const hint = $('#hint');
  hint.textContent = coarse ? 'Tap to flip' : 'Click to flip';
  // Tilt is user-driven, so it stays on with reduced motion; only the idle sway is off.
  if (typeof DeviceOrientationEvent !== 'undefined') {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS asks for motion access only from a user gesture: ask once, quietly, on the first card tap.
      // (Also covers DeviceMotion, which the Konami shake listens to; quests.js gets an 'ha:motion' event.)
      card.addEventListener('click', () => {
        DeviceOrientationEvent.requestPermission().then((state) => {
          if (state === 'granted') addEventListener('deviceorientation', onOrient);
        }).catch(() => {});
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
          DeviceMotionEvent.requestPermission().then((s) => { if (s === 'granted') document.dispatchEvent(new Event('ha:motion')); }).catch(() => {});
        }
      }, { once: true });
    } else if (coarse) {
      addEventListener('deviceorientation', onOrient);
    }
  }

  /* ---------------- save card as PNG ---------------- */
  async function renderCardPNG() {
    const W = 750, H = 1050, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    // gold rim
    let g = x.createLinearGradient(0, 0, W, H);
    ['#f7e08a', '#c99a2e', '#fff2b8', '#e7c15a', '#f7e08a'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
    rr(x, 0, 0, W, H, 44); x.fillStyle = g; x.fill();
    // inner frame
    g = x.createLinearGradient(24, 24, W - 24, H - 24);
    g.addColorStop(0, '#ff4f9a'); g.addColorStop(0.55, C.violet); g.addColorStop(1, C.cyan);
    rr(x, 22, 22, W - 44, H - 44, 28); x.fillStyle = g; x.fill();
    // name + badge
    x.fillStyle = '#fff'; x.textBaseline = 'alphabetic';
    x.shadowColor = 'rgba(0,0,0,.3)'; x.shadowOffsetY = 3;
    x.font = `900 58px ${FONT}`; x.fillText('Adam Bacchus', 46, 96);
    x.textAlign = 'right'; x.fillStyle = C.yellow; x.font = `900 52px ${FONT}`; x.fillText('★', W - 46, 96);
    x.fillStyle = '#fff'; x.font = `900 26px ${FONT}`; x.fillText('PMP', W - 98, 90);
    x.textAlign = 'left'; x.shadowColor = 'transparent';
    // photo
    const px = 44, py = 118, pw = W - 88, ph = 500;
    rr(x, px - 7, py - 7, pw + 14, ph + 14, 16); x.fillStyle = C.cream; x.fill();
    x.save(); rr(x, px, py, pw, ph, 10); x.clip();
    try { drawCover(x, await imgs.adam, px, py, pw, ph, 0.5, 0.3); } catch { x.fillStyle = '#333'; x.fillRect(px, py, pw, ph); }
    x.restore();
    rr(x, px + 12, py + ph - 46, 200, 34, 6); x.fillStyle = 'rgba(11,10,20,.78)'; x.fill();
    x.fillStyle = '#fff'; x.font = `700 19px ${MONO}`; x.fillText('1st Edition · 2026', px + 22, py + ph - 22);
    // type line
    rr(x, 40, 640, W - 80, 52, 10); x.fillStyle = C.cream; x.fill();
    x.fillStyle = C.ink; x.font = `800 26px ${FONT}`; x.fillText('Project Manager · PMP', 58, 675);
    x.textAlign = 'right'; x.fillStyle = C.pink; x.fillText('Legendary Holo', W - 58, 675); x.textAlign = 'left';
    // stats
    rr(x, 40, 706, W - 80, 244, 12); x.fillStyle = 'rgba(255,255,255,.94)'; x.fill();
    const stats = [['🃏', 'Games shipped', '4'], ['📱', 'Apps in flight at once', '7'], ['🌍', 'Devs led, mostly offshore', '20'], ['✂️', 'Special move', 'Cuts scope without crying']];
    stats.forEach(([ic, label, val], i) => {
      const y = 750 + i * 58;
      x.fillStyle = C.ink; x.font = `30px ${FONT}`; x.fillText(ic, 58, y + 2);
      x.font = `600 25px ${FONT}`; x.fillText(label, 104, y);
      x.textAlign = 'right';
      if (i === 3) { x.fillStyle = C.pink; fit(x, val, 300, 25, 900); } else { x.font = `900 34px ${FONT}`; }
      x.fillText(val, W - 58, y + 2); x.textAlign = 'left';
      if (i < 3) { x.strokeStyle = 'rgba(11,10,20,.18)'; x.setLineDash([5, 5]); x.beginPath(); x.moveTo(58, y + 22); x.lineTo(W - 58, y + 22); x.stroke(); x.setLineDash([]); }
    });
    // flavor + foot
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = `italic 500 24px ${FONT}`;
    x.fillText('“He cuts scope, not corners.”', W / 2, 990);
    x.font = `700 20px ${MONO}`; x.fillStyle = 'rgba(255,255,255,.9)';
    x.textAlign = 'left'; x.fillText('Houston, TX', 46, 1020);
    x.textAlign = 'right'; x.fillText('adambacch.us', W - 46, 1020); x.textAlign = 'left';
    // holo foil
    x.save(); rr(x, 0, 0, W, H, 44); x.clip();
    g = x.createLinearGradient(0, 0, W, H * 0.8);
    [C.pink, C.yellow, C.green, C.cyan, C.violet, C.pink, C.yellow].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
    x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.14; x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'soft-light'; x.globalAlpha = 0.4;
    const rg = x.createRadialGradient(W * 0.25, H * 0.2, 10, W * 0.25, H * 0.2, W * 0.8);
    rg.addColorStop(0, 'rgba(255,255,255,.9)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = rg; x.fillRect(0, 0, W, H);
    x.restore();
    return cv;
  }
  $('#saveCard').addEventListener('click', async () => {
    const cv = await renderCardPNG();
    shareOrDownload(await toBlob(cv), 'adam-bacchus-card.png', 'Adam Bacchus · PMP', 'Rare pull: a PMP who ships. ' + SITE);
  });

  /* ---------------- Gantt ---------------- */
  const now = new Date();
  const NOW = now.getFullYear() + now.getMonth() / 12;
  const Y0 = 2016, Y1 = 2029, span = Y1 - Y0;
  const pct = (y) => ((y - Y0) / span) * 100;
  const rows = [
    { id: 'shuffle', name: 'Shuffleware', sub: 'Project Lead', s: 2016, e: 2018.37, color: C.pink, fg: '#fff', bt: '4 games',
      when: 'Jan 2016 – May 2018 · game studio',
      story: 'Led delivery for a studio of up to five, with final say on budget. Took a school project to E3, drew interest from Ubisoft, and picked investor funding over publisher deals that did not fit.',
      result: 'Four iOS card games shipped (Gates, Deal!, Spider Solitaire, Pyramid). Studio acquired by Avabyte.' },
    { id: 'avabyte', name: 'Avabyte', sub: 'Lead Eng. · Offshore Ops', s: 2018.42, e: 2021, color: C.cyan, fg: C.ink, bt: '7 apps',
      when: 'Jun 2018 – Dec 2020',
      story: 'Seven ad-supported apps at once with 5 to 20 developers, mostly offshore. Shifted my hours to overlap their time zones, introduced code review and written delivery guidelines, and broke similar products into shared, reusable features so the workload on each new app dropped.',
      result: 'Seven concurrent apps taken through release and formal acceptance, on a schedule set by the ad budget.' },
    { id: 'browsea', name: 'Browsea', sub: 'Own studio', s: 2021, e: NOW, color: C.violet, fg: '#fff', bt: '~50 apps',
      when: 'Jan 2021 – now · independent studio',
      story: 'A portfolio of 20+ product initiatives, about 50 apps run as one program with shared standards and a formal architecture review, and an AI production pipeline for an independent comics publisher.',
      result: 'Two short visual novels and an animation prototype delivered to the client.', link: true },
    { id: 'formwise', name: 'Formwise', sub: 'UH AI competition', ms: 2025.5, color: C.yellow, fg: C.ink,
      when: '2025 · three-person team',
      story: 'A tool that explains and fills complex forms. Cut scope to a live-demo MVP, kept a nine-item risk register, and kept personal data away from the language model.',
      result: 'One of three winners, University of Houston AI entrepreneurship competition.' },
    { id: 'pmp', name: 'PMP', sub: 'Certified', ms: 2026.58, color: C.green, fg: C.ink,
      when: 'August 2026',
      story: 'Ran exam prep as a five-week project: built a study platform and audited 1,414 practice questions from three banks for answer-key errors.',
      result: 'Passed the PMP, August 2026.' },
    { id: 'next', name: 'Hire Adam', sub: company ? 'Next project · ' + company : 'Next project', s: NOW, e: Y1, next: true, color: C.yellow, fg: C.ink, bt: 'critical',
      when: 'Start date: whenever you say · on the critical path · float: 0 days',
      story: 'Scope, schedule and budget are open for discussion. The resource is available now and already onboarded to your status report. Every day this slips, the whole schedule slips with it.',
      result: 'On the critical path, float 0 days. Waiting on you.', approve: true },
  ];
  const gRows = $('#gRows'), gDetail = $('#gDetail'), gAxis = $('#gAxis'), gantt = $('#gantt');
  for (let y = Y0; y <= Y1; y++) {
    const s = document.createElement('span');
    s.textContent = "'" + String(y).slice(2);
    s.style.left = pct(y) + '%';
    if (y % 2) s.className = 'minor';
    gAxis.appendChild(s);
  }
  $('#gToday').style.left = `calc(var(--label) + (100% - var(--label)) * ${(NOW - Y0) / span})`;
  rows.forEach((r, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'g-row'; b.setAttribute('role', 'listitem'); b.setAttribute('aria-pressed', 'false');
    b.dataset.id = r.id;
    b.innerHTML = `<span class="g-name"></span><span class="g-track"><span class="g-bar${r.ms ? ' ms' : ''}${r.next ? ' next' : ''}"><span class="bt"></span></span></span>`;
    $('.g-name', b).append(r.name, Object.assign(document.createElement('small'), { textContent: r.sub }));
    const bar = $('.g-bar', b);
    bar.style.background = r.color; bar.style.color = r.fg;
    bar.style.transitionDelay = (reduced ? 0 : i * 0.12) + 's';
    if (r.ms) bar.style.left = pct(r.ms) + '%';
    else { bar.style.left = pct(r.s) + '%'; bar.style.width = (pct(r.e) - pct(r.s)) + '%'; $('.bt', bar).textContent = r.bt || ''; }
    b.setAttribute('aria-label', `${r.name}${r.next ? ' (' + r.sub + ')' : ''}, ${r.when}. Show story.`);
    b.addEventListener('click', () => { stopAuto(); showRow(r.id); });
    gRows.appendChild(b);
  });
  function showRow(id) {
    const r = rows.find((x) => x.id === id);
    $$('.g-row', gRows).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
    gDetail.innerHTML = '<h3></h3><p class="when"></p><p class="story"></p><p class="result"></p>';
    $('h3', gDetail).textContent = r.name;
    $('.when', gDetail).textContent = r.when;
    $('.story', gDetail).textContent = r.story;
    $('.result', gDetail).append(r.result);
    if (r.link) gDetail.insertAdjacentHTML('beforeend', '<p style="margin:8px 0 0"><a href="https://browsea.surf" target="_blank" rel="noopener">See the shipped work at browsea.surf ↗</a></p>');
    if (r.approve) {
      const btn = Object.assign(document.createElement('a'), { className: 'btn btn-small btn-approve', textContent: '✉ Copy Adam’s email to propose a start date',
        href: 'mailto:' + EMAIL }); // click copies the address (see "email links copy" below)
      btn.style.marginTop = '10px';
      gDetail.appendChild(btn);
    }
  }
  /* Autoplay: Shuffleware → Avabyte → Browsea → PMP → next, looping. The active bar fills from dark to its colour
     over the dwell time (no numbers). Any click stops it for good. Paused off screen / hidden tab. Off with reduced motion. */
  const AUTO = ['shuffle', 'avabyte', 'browsea', 'pmp', 'next'];
  let autoOn = !reduced, autoIdx = 0, ganttVisible = false;
  function stopAuto() {
    if (!autoOn) return;
    autoOn = false;
    gantt.classList.remove('g-auto', 'g-paused');
    $$('.g-bar.filling', gRows).forEach((x) => x.classList.remove('filling'));
    gDetail.setAttribute('aria-live', 'polite');
  }
  function autoStep() {
    if (!autoOn) return;
    const r = rows.find((x) => x.id === AUTO[autoIdx]);
    showRow(r.id);
    $$('.g-bar.filling', gRows).forEach((x) => x.classList.remove('filling'));
    const bar = $(`.g-row[data-id="${r.id}"] .g-bar`, gRows);
    bar.style.setProperty('--dwell', Math.min(9500, 6200 + Math.max(0, r.story.length + r.result.length - 220) * 12) + 'ms');
    void bar.offsetWidth; bar.classList.add('filling');
  }
  gRows.addEventListener('animationend', (e) => {
    if (!autoOn || e.animationName !== 'gFill') return;
    autoIdx = (autoIdx + 1) % AUTO.length; autoStep();
  });
  const syncPause = () => gantt.classList.toggle('g-paused', !ganttVisible || document.hidden);
  document.addEventListener('visibilitychange', syncPause);
  showRow('shuffle');
  if ('IntersectionObserver' in window && !reduced) {
    let started = false;
    new IntersectionObserver((es) => {
      ganttVisible = es[0].isIntersecting;
      if (ganttVisible) gantt.classList.add('in');
      if (ganttVisible && !started && autoOn) { started = true; gantt.classList.add('g-auto'); gDetail.setAttribute('aria-live', 'off'); setTimeout(autoStep, 900); }
      syncPause();
    }, { threshold: 0.3 }).observe(gantt);
  } else gantt.classList.add('in');

  /* ---------------- PMP exam ---------------- */
  const examSet = $('#examSet'), examResult = $('#examResult');
  $$('.opt', examSet).forEach((o) => o.addEventListener('click', () => {
    $$('.opt', examSet).forEach((x) => x.classList.toggle('chosen', x === o));
    examSet.classList.add('done');
    examResult.hidden = false;
    $('.correct', examResult).textContent = ['Correct.', 'Correct. Obviously.', 'Correct. PMI would approve.', 'Correct. Also: correct.'][$$('.opt', examSet).indexOf(o)];
    examResult.setAttribute('tabindex', '-1'); examResult.focus({ preventScroll: true });
    emit('certified');
  }));

  /* ---------------- selfie booth (lives in comic panel 6) ---------------- */
  let HA_booth = null;
  const sfDlg = $('#selfieDlg') || { open: false, showModal() {}, addEventListener() {} }, booth = $('#boothCanvas'), bctx = booth.getContext('2d'), bvid = $('#boothVideo'), bmsg = $('#boothMsg');
  const bShot = $('#boothShot'), bRetake = $('#boothRetake'), bSave = $('#boothSave'), bUpload = $('#boothUpload');
  let stream = null, liveLoop = 0, side = 'right', frozen = null, frozenMirror = false;
  const BW = 1080, BH = 1350, CAP = 190;

  function drawStandee(ctx, head, cx, bottom) {
    const rx = 150, ry = 178, hcy = bottom - 640, neckY = hcy + ry - 20;
    const body = new Path2D();
    body.moveTo(cx - 70, neckY);
    body.bezierCurveTo(cx - 120, neckY + 30, cx - 230, neckY + 30, cx - 250, neckY + 110);
    body.lineTo(cx - 270, bottom); body.lineTo(cx + 270, bottom); body.lineTo(cx + 250, neckY + 110);
    body.bezierCurveTo(cx + 230, neckY + 30, cx + 120, neckY + 30, cx + 70, neckY);
    body.closePath();
    const headP = new Path2D(); headP.ellipse(cx, hcy, rx, ry, 0, 0, Math.PI * 2);
    // cardboard sticker outline + shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetX = 10; ctx.shadowOffsetY = 14;
    ctx.lineWidth = 26; ctx.lineJoin = 'round'; ctx.strokeStyle = '#fff';
    ctx.stroke(body); ctx.stroke(headP); ctx.fillStyle = '#fff'; ctx.fill(body); ctx.fill(headP);
    ctx.restore();
    // suit
    let g = ctx.createLinearGradient(cx - 260, 0, cx + 260, 0);
    g.addColorStop(0, '#141a33'); g.addColorStop(0.5, '#2a3466'); g.addColorStop(1, '#141a33');
    ctx.fillStyle = g; ctx.fill(body);
    // shirt + pink tie
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(cx - 70, neckY); ctx.lineTo(cx + 70, neckY); ctx.lineTo(cx, neckY + 200); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.pink; ctx.beginPath(); ctx.moveTo(cx - 18, neckY + 6); ctx.lineTo(cx + 18, neckY + 6); ctx.lineTo(cx + 26, neckY + 200); ctx.lineTo(cx, neckY + 240); ctx.lineTo(cx - 26, neckY + 200); ctx.closePath(); ctx.fill();
    // lapels
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx - 70, neckY); ctx.lineTo(cx - 10, neckY + 260); ctx.moveTo(cx + 70, neckY); ctx.lineTo(cx + 10, neckY + 260); ctx.stroke();
    // badge
    ctx.save(); ctx.translate(cx + 150, neckY + 230); ctx.rotate(0.08);
    ctx.strokeStyle = C.yellow; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-40, -140); ctx.lineTo(0, -6); ctx.lineTo(40, -140); ctx.stroke();
    rr(ctx, -62, 0, 124, 150, 12); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.fillStyle = C.green; ctx.fillRect(-62, 0, 124, 34);
    ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.font = `900 17px ${FONT}`; ctx.fillText('NOT A VISITOR', 0, 24);
    ctx.font = `900 50px ${FONT}`; ctx.fillText('PMP', 0, 92); ctx.font = `800 20px ${MONO}`; ctx.fillText('ADAM', 0, 128);
    ctx.restore();
    // head photo
    ctx.save(); ctx.clip(headP);
    if (head) { const s = (rx * 2 * 1.06) / 406; ctx.drawImage(head, cx - 210 * s, hcy - 262 * s, 480 * s, 593 * s); }
    else { ctx.fillStyle = '#888'; ctx.fill(headP); }
    ctx.restore();
  }

  async function composeBooth(src, mirror) {
    const ctx = bctx;
    ctx.fillStyle = C.ink; ctx.fillRect(0, 0, BW, BH);
    if (src) drawCover(ctx, src, 0, 0, BW, BH - CAP, 0.5, 0.4, mirror);
    else {
      const g = ctx.createLinearGradient(0, 0, BW, BH); g.addColorStop(0, '#2b1b5a'); g.addColorStop(1, '#5a1b3d');
      ctx.fillStyle = g; ctx.fillRect(0, 0, BW, BH - CAP);
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = `800 44px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText('You go here →', side === 'right' ? BW * 0.3 : BW * 0.7, 560); ctx.textAlign = 'left';
    }
    let head = null; try { head = await imgs.adam; } catch { /* placeholder */ }
    drawStandee(ctx, head, side === 'right' ? BW * 0.74 : BW * 0.26, BH - CAP + 20);
    // project pill
    ctx.font = `800 26px ${MONO}`; const pill = '● PROJECT: HIRE ADAM · AVAILABLE NOW', pw = ctx.measureText(pill).width + 40;
    rr(ctx, 30, 30, pw, 54, 27); ctx.fillStyle = 'rgba(11,10,20,.78)'; ctx.fill();
    ctx.fillStyle = C.green; ctx.fillText('●', 50, 66); ctx.fillStyle = '#fff'; ctx.fillText(pill.slice(1), 72, 66);
    // caption band
    ctx.fillStyle = C.ink; ctx.fillRect(0, BH - CAP, BW, CAP);
    const g2 = ctx.createLinearGradient(0, 0, BW, 0); [C.pink, C.yellow, C.green, C.cyan, C.violet].forEach((c, i) => g2.addColorStop(i / 4, c));
    ctx.fillStyle = g2; ctx.fillRect(0, BH - CAP, BW, 10);
    ctx.fillStyle = '#fff'; ctx.font = `900 54px ${FONT}`; ctx.fillText('Met Adam Bacchus, PMP.', 40, BH - CAP + 80);
    ctx.fillStyle = C.yellow; ctx.fillText('Would hire again.', 40, BH - CAP + 140);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = `600 22px ${MONO}`;
    ctx.fillText('adambacch.us · ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 40, BH - 18);
    try {
      const q = await imgs.qr; const qs = 150;
      rr(ctx, BW - qs - 40, BH - CAP + 22, qs + 16, qs + 16, 10); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.imageSmoothingEnabled = false; ctx.drawImage(q, BW - qs - 32, BH - CAP + 30, qs, qs); ctx.imageSmoothingEnabled = true;
    } catch { /* QR optional */ }
  }

  function stopCam() {
    cancelAnimationFrame(liveLoop); liveLoop = 0;
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    bvid.srcObject = null;
  }
  function setBoothState(state) {
    bShot.hidden = state !== 'live';
    bRetake.hidden = state !== 'frozen';
    bSave.hidden = state !== 'frozen';
  }
  async function startCam() {
    frozen = null; setBoothState('idle');
    bmsg.textContent = 'Starting camera…';
    await composeBooth(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      bmsg.textContent = 'No camera here. Use a photo instead; Adam is not picky.'; return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      if (!sfDlg.open && !booth.closest('.panel.open')) { stopCam(); return; } // closed while the camera was asking
      bvid.srcObject = stream; await bvid.play();
      bmsg.textContent = ''; setBoothState('live');
      let busy = false;
      const loop = () => {
        if (!busy) { busy = true; composeBooth(bvid, true).then(() => { busy = false; }); }
        liveLoop = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      stopCam();
      bmsg.textContent = (e && e.name === 'NotAllowedError')
        ? 'Camera permission said no. Fair. Use a photo instead.'
        : 'Camera unavailable. Use a photo instead; Adam is not picky.';
    }
  }
  $('#openSelfie').addEventListener('click', () => { if (!booth.closest('.panel')) sfDlg.showModal(); startCam(); });
  HA_booth = { stop: stopCam, idle: () => { if (!stream && !frozen) composeBooth(null); } };
  sfDlg.addEventListener('close', stopCam);
  bShot.addEventListener('click', async () => {
    const snap = document.createElement('canvas'); snap.width = bvid.videoWidth; snap.height = bvid.videoHeight;
    snap.getContext('2d').drawImage(bvid, 0, 0);
    stopCam(); frozen = snap; frozenMirror = true;
    await composeBooth(frozen, true); setBoothState('frozen');
    bmsg.textContent = '';
    emit('selfie', { canvas: booth });
  });
  bRetake.addEventListener('click', startCam);
  bUpload.addEventListener('change', async () => {
    const f = bUpload.files && bUpload.files[0]; if (!f) return;
    stopCam();
    try {
      const url = URL.createObjectURL(f); const im = await loadImg(url); URL.revokeObjectURL(url);
      frozen = im; frozenMirror = false; await composeBooth(frozen, false); setBoothState('frozen'); bmsg.textContent = '';
      emit('selfie', { canvas: booth });
    } catch { bmsg.textContent = 'That file did not load as an image. Try another?'; }
    bUpload.value = '';
  });
  $('#boothSide').addEventListener('click', () => {
    side = side === 'right' ? 'left' : 'right';
    if (frozen) composeBooth(frozen, frozenMirror); else if (!stream) composeBooth(null);
  });
  bSave.addEventListener('click', async () => {
    shareOrDownload(await toBlob(booth), 'selfie-with-adam-bacchus.png', 'Met Adam Bacchus, PMP', 'Would hire again. ' + SITE);
  });

  /* ---------------- kickoff video slot ---------------- */
  (async () => {
    const sec = $('#kickoff'), v = $('#kickoffVideo');
    try {
      const r = await fetch('media/kickoff.mp4', { method: 'HEAD' });
      if (!r.ok || !/video|octet/.test(r.headers.get('content-type') || 'video')) return;
    } catch { return; }
    v.innerHTML = '<source src="media/kickoff.mp4" type="video/mp4"><track kind="captions" src="media/kickoff.vtt" srclang="en" label="English" default>';
    v.addEventListener('loadeddata', () => {
      sec.hidden = false;
      if (reduced) v.controls = true; else v.play().catch(() => { v.controls = true; });
    }, { once: true });
    if (!reduced) v.autoplay = true;
    v.load();
  })();

  /* ---------------- console easter egg ---------------- */
  window.hireAdam = () => { emit('hacker'); location.href = mailto(EMAIL, 'Escalation from devtools: ' + projectLine, 'Hi Adam,\n\nFound you in the console. Let\'s talk.\n\n'); return '📨 Escalated. (Check your mail app.)'; };
  window.gantt = () => { emit('hacker'); console.table(rows.map((r) => ({ project: r.name, role: r.sub, when: r.when, result: r.result }))); return 'Float: 0 days.'; };
  console.log('%c Project: Hire Adam ', `font:900 22px ${FONT};color:#0b0a14;background:#ffd60a;padding:6px 4px;border-radius:4px`);
  console.log('%cOpening devtools on a project manager\'s site? You are exactly the stakeholder he plans for.\n' +
    'Adam has a BS in Computer Science, runs ~50 apps as one program, and writes specs AI agents can actually follow.\n' +
    'Zero dependencies here, by the way. The QR code was pre-rendered at build time.\n\n' +
    '  hireAdam()  → escalate to sponsor (opens email)\n' +
    '  gantt()     → print the career Gantt as a table\n' +
    '  binder()    → list your collectible cards (and pocket a secret one)\n\n' +
    'Keyboard people: ↑↑↓↓←→←→BA also does something.\n', `font:13px/1.5 ${MONO};color:#7b5cff`);

  /* ---------------- email links copy the address instead of opening a mail app ---------------- */
  async function copyEmail() {
    let ok = false;
    try { await navigator.clipboard.writeText(EMAIL); ok = true; } catch {
      const ta = document.createElement('textarea');
      ta.value = EMAIL; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
    }
    toast(ok ? 'Email copied: ' + EMAIL : 'Copy this address: ' + EMAIL);
  }
  // every mailto: link on the page (header, dock, Gantt, footer) copies instead; the href stays as a no-JS fallback
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="mailto:"]');
    if (!a) return;
    e.preventDefault(); copyEmail();
  });

  /* ---------------- save contact (vCard + copy) ---------------- */
  const CONTACT_TEXT = [
    'Adam Bacchus', 'Project Manager · PMP', 'Houston, TX', '+1 (832) 844-7118', EMAIL,
    'https://adambacch.us', 'linkedin.com/in/adam-bacchus-950a9b210', 'github.com/adamPlusPlus',
  ].join('\n');
  (() => {
    const btn = $('#contactBtn'), pop = $('#contactPop'), add = $('#cpAdd');
    if (!btn || !pop) return;
    const canPop = typeof pop.showPopover === 'function';
    const isOpen = () => (canPop ? pop.matches(':popover-open') : pop.classList.contains('open'));
    function open() {
      if (canPop) pop.showPopover(); else pop.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      setTimeout(() => add.focus(), 0);
    }
    function close(refocus = true) {
      if (canPop) { try { pop.hidePopover(); } catch { /* already closed */ } } else pop.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      if (refocus) btn.focus();
    }
    btn.addEventListener('click', () => (isOpen() ? close() : open()));
    $('#cpClose').addEventListener('click', () => close());
    // light dismiss (Esc / outside click) closes the popover natively; keep aria + focus in sync
    pop.addEventListener('toggle', (e) => {
      if (e.newState === 'closed') { btn.setAttribute('aria-expanded', 'false'); if (pop.contains(document.activeElement) || document.activeElement === document.body) btn.focus(); }
    });
    if (!canPop) {
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) close(); });
      document.addEventListener('click', (e) => { if (isOpen() && !pop.contains(e.target) && !btn.contains(e.target)) close(false); });
    }
    // Tab stays inside the sheet while it is open
    pop.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = $$('a[href], button', pop); const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    // "Add to contacts": share the .vcf file where the platform can (phones), else the download link does its job
    add.addEventListener('click', async (e) => {
      if (!coarse || !navigator.canShare || !window.File) return;
      e.preventDefault();
      try {
        const res = await fetch(add.getAttribute('href'));
        const file = new File([await res.blob()], 'adam-bacchus.vcf', { type: 'text/vcard' });
        if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Adam Bacchus' }); close(); return; }
      } catch (err) { if (err && err.name === 'AbortError') return; }
      const a = document.createElement('a'); a.href = add.getAttribute('href'); a.download = 'adam-bacchus.vcf';
      document.body.appendChild(a); a.click(); a.remove();
    });
    $('#cpCopy').addEventListener('click', async () => { await copy(CONTACT_TEXT, 'Copied'); close(); });
    window.HA_openContact = open;
  })();

  /* ---------------- dock: Resume / Email hide while the hero's own row is on screen ---------------- */
  (() => {
    const row = $('.cta'), dock = $('.dock');
    if (!row || !dock || !('IntersectionObserver' in window)) return;
    new IntersectionObserver((es) => {
      const on = es[0].isIntersecting;
      dock.classList.toggle('hero-on', on);
      $$('.dock-resume, .dock-email', dock).forEach((a) => { if (on) { a.setAttribute('tabindex', '-1'); a.setAttribute('aria-hidden', 'true'); } else { a.removeAttribute('tabindex'); a.removeAttribute('aria-hidden'); } });
    }, { threshold: 0.01 }).observe(row);
  })();

  /* ---------------- shared with quests.js ---------------- */
  window.HA = { $, $$, toast, topLayer, copy, mailto, download, shareOrDownload, toBlob, loadImg, rr, fit, drawCover, imgs, emit,
    reduced, coarse, C, FONT, MONO, EMAIL, PHONE, company, SITE, projectLine, booth: HA_booth };
})();
