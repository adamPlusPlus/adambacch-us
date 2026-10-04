/* adambacch.us v2 — side quests, jokes and the collectible card binder. Zero dependencies.
   Every joke nods to something Adam actually built; every interaction drops a card into the binder. */
(() => {
  'use strict';
  // Where "Application to employ Adam" is sent: Adam's own server (ki-fu/job-search/browsea-apply.cjs, behind
  // browsea.surf), which saves each JSON POST ({ name, email, company, role, message, page }) and emails it to him.
  // Empty means not live: the form then says so and shows Adam's address.
  const APPLY_ENDPOINT = 'https://browsea.surf/api/apply';
  const HA = window.HA;
  if (!HA) return;
  const { $, $$, toast, topLayer, mailto, reduced, coarse, C, FONT, MONO, EMAIL, company, SITE, projectLine, rr, fit, drawCover, imgs, toBlob, shareOrDownload, loadImg } = HA;
  const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const srLive = $('#srLive');
  const say = (msg) => { srLive.textContent = ''; setTimeout(() => { srLive.textContent = msg; }, 60); };
  const onVisible = (el, fn, threshold = 0.35) => {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); } }, { threshold });
    io.observe(el);
  };

  /* =================================================================
     Card set
     ================================================================= */
  const RAR = {
    common: { label: 'Common', glyph: '●', rim: ['#f2f4f8', '#a9b1bf', '#ffffff', '#8f98a8'] },
    uncommon: { label: 'Uncommon', glyph: '◆', rim: ['#c9f7ff', '#29d3ff', '#eefcff', '#1597bf'] },
    rare: { label: 'Rare', glyph: '★', rim: ['#f7e08a', '#c99a2e', '#fff2b8', '#e7c15a'] },
    secret: { label: 'Secret', glyph: '✦', rim: ['#ff2e88', '#7b5cff', '#29d3ff', '#7b5cff'] },
    legendary: { label: 'Legendary', glyph: '♛', rim: [C.pink, C.yellow, C.green, C.cyan, C.violet, C.pink] },
  };
  const CARDS = [
    { id: 'adam', name: 'Adam Bacchus', r: 'common', art: 'adam', bg: ['#ff4f9a', '#7b5cff'], flavor: 'Project manager, PMP. Spotted in the wild: Houston, TX.', hint: 'Free with every visit.' },
    { id: 'resume', name: 'Paper Trail', r: 'common', icon: '📄', bg: ['#ffe866', '#e0a100'], flavor: 'PMP. BS Computer Science. Three companies. One PDF, no filler.', hint: 'Open the resume (any Resume button).', act: 'resume' },
    { id: 'spider', name: 'Clean Sweep', r: 'rare', icon: '🕷️', bg: ['#1d7a46', '#0b3d22'], flavor: 'One suit, King to Ace. He shipped the real Spider Solitaire.', hint: 'Comic panel 1: win the Spider half-deck.', p: 1 },
    { id: 'nat20', name: 'Natural 20', r: 'rare', icon: '🎲', bg: ['#7b5cff', '#21135c'], flavor: 'Persuasion vs DC 15. Resolved by the book. With tests.', hint: 'Comic panel 2: roll Persuasion at E3.', p: 2 },
    { id: 'wip', name: 'Right Priority', r: 'uncommon', icon: '🗂️', bg: ['#ffd60a', '#ff2e88'], flavor: 'WIP limit: 1. You picked the one task worth doing.', hint: 'Comic panel 3: put the right task into Doing.', p: 3 },
    { id: 'studio', name: 'Studio Tour', r: 'uncommon', icon: '🗺️', bg: ['#0f6e7a', '#08343a'], flavor: 'Charted the studio’s waters. About 50 apps, seven islands.', hint: 'Comic panel 4: explore three islands on the Browsea chart.', p: 4 },
    { id: 'certified', name: 'Certified', r: 'uncommon', icon: '🎓', bg: ['#ffd60a', '#ff8a1c'], flavor: 'Passed the PMP, August 2026. Answer key audited.', hint: 'Comic panel 5: answer the PMP question.', p: 5 },
    { id: 'selfie', name: 'Met Adam', r: 'rare', art: 'selfie', icon: '📸', bg: ['#29d3ff', '#7b5cff'], flavor: 'Cardboard Adam. Real you. Would hire again.', hint: 'Comic panel 6: take a selfie with Adam.', p: 6 },
    { id: 'sniped', name: 'Sniped', r: 'uncommon', icon: '⏱️', bg: ['#ff7a3d', '#ff2e88'], flavor: 'Outbid at 0:01 by an assistant with a budget and a price cap.', hint: 'Comic panel 7: bid on Adam.', p: 7 },
    { id: 'comic', name: 'Origin Story', r: 'rare', icon: '💥', bg: ['#ff2e88', '#ffd60a'], flavor: 'Seven panels, seven quests, one career.', hint: 'Play every panel of the comic.', go: '#comic' },
    { id: 'hacker', name: 'Hacker', r: 'secret', icon: '⌨️', bg: ['#0f3d26', '#0b0a14'], flavor: 'Read the console. Devs and PMs both welcome.', hint: 'Some stakeholders read the console.', act: 'console' },
    { id: 'konami', name: 'Konami', r: 'secret', icon: '🎮', bg: ['#ff2e88', '#29d3ff'], flavor: 'Up, up, down, down, left, right, left, right, B, A. Any input, any output.', hint: 'A famous code, on any input device. Phones can shake.', act: 'pad' },
    { id: 'hired', name: 'HIRED', r: 'legendary', icon: '🏆', bg: ['#ffd60a', '#22e07a'], flavor: 'Every quest closed. One decision left, and it is yours.', hint: 'Collect the other 12 cards.', act: 'capstone' },
  ];
  const TOTAL = CARDS.length;
  const byId = Object.fromEntries(CARDS.map((c, i) => [c.id, Object.assign(c, { no: i + 1 })]));

  /* ---------- state (localStorage is a convenience; the page works without it) ---------- */
  const KEY = 'hireAdam.binder.v1';
  let st = { earned: {}, selfie: null };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.earned) st = { earned: s.earned, selfie: s.selfie || null }; } catch { /* private mode */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* quota / private mode */ } };
  // HIRED is the capstone for the other 12; drop one saved by an older version of the page.
  if (st.earned.hired && CARDS.some((c) => c.id !== 'hired' && !st.earned[c.id])) { delete st.earned.hired; save(); }
  const count = () => CARDS.filter((c) => st.earned[c.id]).length;
  let selfieImg = null;
  const getSelfie = () => (st.selfie ? (selfieImg = selfieImg || loadImg(st.selfie)) : Promise.reject());

  /* =================================================================
     Mini card renderer (canvas) — used by the reveal, binder and PNG
     ================================================================= */
  const MW = 360, MH = 504;
  const cache = new Map();
  function wrap(x, text, maxW) {
    const words = text.split(' '), lines = [];
    let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line);
    return lines;
  }
  function grad(x, cols, x0, y0, x1, y1) { const g = x.createLinearGradient(x0, y0, x1, y1); cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c)); return g; }
  async function drawMini(def, s = 1) {
    const key = def.id + '@' + s;
    if (cache.has(key)) return cache.get(key);
    const cv = document.createElement('canvas'); cv.width = MW * s; cv.height = MH * s;
    const x = cv.getContext('2d'), rar = RAR[def.r];
    x.scale(s, s);
    rr(x, 0, 0, MW, MH, 26); x.fillStyle = grad(x, rar.rim, 0, 0, MW, MH); x.fill();
    rr(x, 13, 13, MW - 26, MH - 26, 16); x.fillStyle = grad(x, def.bg, 13, 13, MW - 13, MH - 13); x.fill();
    // header
    x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowOffsetY = 2 * s;
    fit(x, def.name, MW - 110, 30, 900); x.fillText(def.name, 28, 52);
    x.textAlign = 'right'; x.font = `900 26px ${FONT}`; x.fillStyle = def.r === 'common' ? '#fff' : C.yellow; x.fillText(rar.glyph, MW - 28, 51);
    x.textAlign = 'left'; x.shadowColor = 'transparent';
    // art box
    const ax = 26, ay = 66, aw = MW - 52, ah = 244;
    rr(x, ax - 5, ay - 5, aw + 10, ah + 10, 12); x.fillStyle = C.cream; x.fill();
    x.save(); rr(x, ax, ay, aw, ah, 8); x.clip();
    let drew = false;
    if (def.art === 'adam') { try { drawCover(x, await imgs.adam, ax, ay, aw, ah, 0.5, 0.28); drew = true; } catch { /* fall through */ } }
    if (def.art === 'selfie') { try { drawCover(x, await getSelfie(), ax, ay, aw, ah, 0.5, 0.4); drew = true; } catch { /* no selfie yet */ } }
    if (!drew) {
      const rg = x.createRadialGradient(MW / 2, ay + ah / 2, 10, MW / 2, ay + ah / 2, aw * 0.75);
      rg.addColorStop(0, 'rgba(255,255,255,.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = grad(x, def.bg.slice().reverse(), ax, ay, ax + aw, ay + ah); x.fillRect(ax, ay, aw, ah);
      x.fillStyle = rg; x.fillRect(ax, ay, aw, ah);
      x.save(); x.translate(MW / 2, ay + ah / 2); x.fillStyle = 'rgba(255,255,255,.12)';
      for (let i = 0; i < 16; i += 2) { x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 300, (i / 16) * Math.PI * 2, ((i + 1) / 16) * Math.PI * 2); x.fill(); }
      x.restore();
      x.fillStyle = 'rgba(0,0,0,.12)';
      for (let yy = ay + 6; yy < ay + ah; yy += 12) for (let xx = ax + ((yy / 12) % 2 ? 6 : 0); xx < ax + aw; xx += 12) { x.beginPath(); x.arc(xx, yy, 1.8, 0, 7); x.fill(); }
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `128px ${EMOJI}`; x.fillStyle = '#000';
      x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 18 * s; x.shadowOffsetY = 8 * s;
      x.fillText(def.icon, MW / 2, ay + ah / 2 + 6);
      x.shadowColor = 'transparent'; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    }
    x.restore();
    // type line
    rr(x, 22, 322, MW - 44, 36, 8); x.fillStyle = C.cream; x.fill();
    x.fillStyle = C.ink; x.font = `800 17px ${FONT}`; x.fillText(rar.label + ' · Quest card', 34, 346);
    x.textAlign = 'right'; x.font = `700 15px ${MONO}`; x.fillStyle = C.pink; x.fillText(`No. ${String(def.no).padStart(2, '0')}/${TOTAL}`, MW - 34, 346); x.textAlign = 'left';
    // flavor
    rr(x, 22, 368, MW - 44, 92, 8); x.fillStyle = 'rgba(255,255,255,.94)'; x.fill();
    x.fillStyle = C.ink; x.font = `italic 600 18px ${FONT}`;
    wrap(x, def.flavor, MW - 76).slice(0, 3).forEach((l, i) => x.fillText(l, 36, 396 + i * 24));
    // foot
    x.font = `700 13px ${MONO}`; x.fillStyle = 'rgba(255,255,255,.92)';
    x.fillText('adambacch.us', 26, MH - 22); x.textAlign = 'right'; x.fillText('PROJECT: HIRE ADAM', MW - 26, MH - 22); x.textAlign = 'left';
    // foil for rare and up
    if (def.r !== 'common' && def.r !== 'uncommon') {
      x.save(); rr(x, 0, 0, MW, MH, 26); x.clip();
      x.globalCompositeOperation = 'overlay'; x.globalAlpha = def.r === 'legendary' ? 0.3 : 0.18;
      x.fillStyle = grad(x, [C.pink, C.yellow, C.green, C.cyan, C.violet, C.pink], 0, 0, MW, MH); x.fillRect(0, 0, MW, MH);
      x.restore();
    }
    cache.set(key, cv);
    return cv;
  }
  function copyCanvas(src, w) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = Math.round(w * 1.4);
    const x = cv.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, cv.width, cv.height);
    return cv;
  }

  /* =================================================================
     Earning, the reveal queue, the binder bar
     ================================================================= */
  let chain = Promise.resolve();
  const enqueue = (fn) => { chain = chain.then(fn).catch(() => {}); return chain; };
  const binderBtn = $('#binderBtn'), binderN = $('#binderN');
  function renderBar() {
    const n = count();
    binderN.textContent = `${n}/${TOTAL}`;
    binderBtn.setAttribute('aria-label', `Card binder: ${n} of ${TOTAL} cards collected`);
    binderBtn.classList.toggle('full', n === TOTAL);
  }
  function renderQuests() {
    $$('[data-quest]').forEach((el) => {
      const d = byId[el.dataset.quest]; if (!d) return;
      const got = !!st.earned[d.id];
      el.classList.toggle('got', got);
      el.textContent = got ? `✓ Card earned: ${d.name}` : `🃏 Quest card: ${d.name} · ${RAR[d.r].label}`;
    });
  }
  function bump() { binderBtn.classList.remove('bump'); void binderBtn.offsetWidth; binderBtn.classList.add('bump'); }

  function earn(id, extra) {
    const def = byId[id]; if (!def) return;
    if (id === 'selfie' && extra && extra.thumb) { st.selfie = extra.thumb; selfieImg = null; cache.delete('selfie@1'); cache.delete('selfie@2'); }
    if (st.earned[id]) {
      if (id === 'selfie' && extra && extra.thumb) { save(); toast('Selfie card updated in your binder.'); }
      return;
    }
    st.earned[id] = Date.now(); save();
    renderBar(); renderQuests();
    document.dispatchEvent(new CustomEvent('ha:earned', { detail: { id } }));
    const n = count();
    enqueue(() => reveal(def, n));
    if (id !== 'hired' && !st.earned.hired && CARDS.every((c) => c.id === 'hired' || st.earned[c.id])) { earn('hired'); return; }
    if (n === TOTAL) enqueue(complete);
  }

  /* ---------- card-pack reveal (flip + holo, then flies into the binder) ---------- */
  const pack = $('#pack'), packBtn = $('#packBtn'), packCard = $('#packCard'), packCv = $('#packCanvas');
  let packDone = null, packId = null;
  async function reveal(def, n) {
    const src = await drawMini(def);
    const pctx = packCv.getContext('2d'); pctx.clearRect(0, 0, MW, MH); pctx.drawImage(src, 0, 0);
    $('#packKicker').textContent = def.r === 'secret' ? 'Secret card!' : def.r === 'legendary' ? 'Legendary!' : 'New card';
    $('#packName').textContent = `${def.name} · ${RAR[def.r].label}`;
    $('#packCount').textContent = `Binder ${n}/${TOTAL} · tap to view`;
    packId = def.id;
    pack.dataset.r = def.r;
    pack.classList.remove('out', 'go'); pack.style.removeProperty('--tx'); pack.style.removeProperty('--ty');
    pack.classList.add('open'); topLayer(pack);
    void pack.offsetWidth; pack.classList.add('go');
    say(`New card: ${def.name}, ${RAR[def.r].label}. Binder ${n} of ${TOTAL}.`);
    await new Promise((res) => { packDone = res; setTimeout(res, reduced ? 2600 : 3000); });
    packDone = null;
    // fly into the binder button
    const a = packCard.getBoundingClientRect(), b = binderBtn.getBoundingClientRect();
    pack.style.setProperty('--tx', (b.left + b.width / 2 - (a.left + a.width / 2)) + 'px');
    pack.style.setProperty('--ty', (b.top + b.height / 2 - (a.top + a.height / 2)) + 'px');
    pack.classList.add('out');
    await sleep(reduced ? 150 : 520);
    pack.classList.remove('open', 'go', 'out');
    try { if (pack.matches(':popover-open')) pack.hidePopover(); } catch { /* no popover support */ }
    bump();
  }
  packBtn.addEventListener('click', () => { const id = packId; if (packDone) packDone(); setTimeout(() => openViewer(id, binderBtn), 60); });

  /* =================================================================
     Solitaire win cascade (he shipped Spider Solitaire)
     ================================================================= */
  const winDlg = $('#winDlg'), winCv = $('#winCanvas');
  let lastCascade = 0;
  async function cascade(title, sub) {
    lastCascade = Date.now();
    $('#winT').textContent = title; $('#winS').textContent = sub;
    const earned = CARDS.filter((c) => st.earned[c.id]);
    const sources = await Promise.all((earned.length ? earned : [byId.adam]).map((d) => drawMini(d)));
    const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    winCv.width = W * dpr; winCv.height = H * dpr;
    const ctx = winCv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    winDlg.classList.toggle('static', reduced);
    winDlg.showModal();
    const cw = clamp(Math.round(W * 0.17), 64, 104), ch = Math.round(cw * 1.4);
    const sprites = sources.map((s) => copyCanvas(s, Math.round(cw * dpr)));
    return new Promise((resolve) => {
      let raf = 0, done = false, timer = 0;
      const finish = () => {
        if (done) return; done = true;
        cancelAnimationFrame(raf); clearTimeout(timer);
        winDlg.removeEventListener('click', onTap);
        if (winDlg.open) winDlg.close();
        ctx.clearRect(0, 0, W, H);
        resolve();
      };
      // ignore the click a touch tap sends right after the winning move, or the cascade would close at once
      const openedAt = performance.now();
      const onTap = () => { if (performance.now() - openedAt > 700) finish(); };
      winDlg.addEventListener('click', onTap);
      winDlg.addEventListener('close', finish, { once: true });
      if (reduced) {
        // static "You win": the cards, fanned out, no motion
        const n = Math.min(sprites.length, 13), step = Math.min(cw * 0.62, (W - 40 - cw) / Math.max(1, n - 1));
        const x0 = (W - (step * (n - 1) + cw)) / 2, y0 = H - ch - Math.max(40, H * 0.12);
        sprites.slice(0, n).forEach((s, i) => ctx.drawImage(s, x0 + i * step, y0 + Math.abs(i - (n - 1) / 2) * 6, cw, ch));
        timer = setTimeout(finish, 12000);
        return;
      }
      // foundation piles along the top, cards bounce out one by one leaving trails
      const piles = 4, gap = 10, fy = 14, fx0 = W - piles * (cw + gap) - 6;
      for (let i = 0; i < piles; i++) ctx.drawImage(sprites[i % sprites.length], fx0 + i * (cw + gap), fy, cw, ch);
      const total = Math.max(28, sprites.length * 2), active = [];
      let launched = 0, nextAt = performance.now() + 250, last = performance.now();
      const step = (t) => {
        const k = clamp((t - last) / 16.67, 0.25, 3); last = t;
        if (t >= nextAt && launched < total) {
          const p = launched % piles;
          active.push({ x: fx0 + p * (cw + gap), y: fy, vx: (Math.random() * 4 + 2.2) * (Math.random() < 0.72 ? -1 : 1), vy: -Math.random() * 5 - 1, s: sprites[launched % sprites.length] });
          launched++; nextAt = t + 300;
        }
        for (let i = active.length - 1; i >= 0; i--) {
          const a = active[i];
          a.vy += 0.6 * k; a.x += a.vx * k; a.y += a.vy * k;
          if (a.y + ch > H) { a.y = H - ch; a.vy = -a.vy * 0.8; }
          ctx.drawImage(a.s, a.x, a.y, cw, ch);
          if (a.x < -cw || a.x > W) active.splice(i, 1);
        }
        if (launched >= total && !active.length) { timer = setTimeout(finish, 2200); return; }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      timer = setTimeout(finish, 26000);
    });
  }

  /* =================================================================
     Binder sheet
     ================================================================= */
  const bDlg = $('#binderDlg'), bGrid = $('#bdGrid'), bDetail = $('#bdDetail');
  async function renderBinder() {
    const n = count();
    $('#bdCount').textContent = `${n}/${TOTAL}`;
    $('#bdBar').style.width = (n / TOTAL) * 100 + '%';
    $('#bdSub').textContent = n === TOTAL
      ? 'Full set. You read the whole status report, which puts you ahead of most steering committees.'
      : 'Every part of the status report hides a card. Tap a blank slot for a hint.';
    bDlg.classList.toggle('complete', n === TOTAL);
    bGrid.innerHTML = '';
    for (const d of CARDS) {
      const li = document.createElement('li');
      const b = document.createElement('button'); b.type = 'button'; b.className = 'bd-slot'; b.dataset.id = d.id; b.dataset.r = d.r;
      if (st.earned[d.id]) {
        b.classList.add('got');
        b.setAttribute('aria-label', `${d.name}, ${RAR[d.r].label}. Open in the card viewer.`);
        const cv = copyCanvas(await drawMini(d), 220); cv.setAttribute('aria-hidden', 'true');
        b.appendChild(cv);
      } else {
        b.setAttribute('aria-label', `Card ${d.no}, not collected yet (${RAR[d.r].label}). Show hint.`);
        b.innerHTML = `<span class="bd-q" aria-hidden="true">?</span><span class="bd-r" aria-hidden="true"></span><span class="bd-h" aria-hidden="true"></span>`;
        $('.bd-r', b).textContent = RAR[d.r].label;
        $('.bd-h', b).textContent = d.r === 'secret' ? 'Secret' : d.hint;
      }
      b.addEventListener('click', () => { if (st.earned[d.id]) { bDetail.hidden = true; $$('.bd-slot', bGrid).forEach((x) => x.classList.remove('sel')); openViewer(d.id, b); } else showDetail(d.id); });
      li.appendChild(b); bGrid.appendChild(li);
    }
  }
  async function showDetail(id) {
    const d = byId[id];
    $$('.bd-slot', bGrid).forEach((b) => b.classList.toggle('sel', b.dataset.id === id));
    bDetail.hidden = false; bDetail.innerHTML = '';
    if (st.earned[id]) {
      const cv = copyCanvas(await drawMini(d), 300); cv.className = 'bd-big'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', `${d.name} card: ${d.flavor}`);
      const tx = document.createElement('div'); tx.className = 'bd-tx';
      tx.innerHTML = '<p class="bd-n"></p><p class="bd-f"></p><p class="bd-w"></p>';
      $('.bd-n', tx).textContent = `${d.name} · ${RAR[d.r].label}`;
      $('.bd-f', tx).textContent = d.flavor;
      $('.bd-w', tx).textContent = 'Collected ' + new Date(st.earned[id]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      bDetail.append(cv, tx);
      return;
    }
    const tx = document.createElement('div'); tx.className = 'bd-tx';
    tx.innerHTML = '<p class="bd-n"></p><p class="bd-f"></p>';
    $('.bd-n', tx).textContent = `Card ${d.no} · ${RAR[d.r].label} · not collected`;
    $('.bd-f', tx).textContent = 'Hint: ' + d.hint;
    bDetail.appendChild(tx);
    const go = document.createElement('button'); go.type = 'button'; go.className = 'btn btn-small';
    if (d.act === 'pad') { tx.appendChild(buildPad()); return; }
    if (d.act === 'console') { tx.appendChild(buildMiniConsole()); return; }
    if (d.act === 'capstone') { $('.bd-f', tx).textContent = `Hint: ${d.hint} You have ${count()} of ${TOTAL - 1}.`; return; }
    if (d.p) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-small'; b.textContent = `Take me to panel ${d.p} ↓`;
      b.addEventListener('click', () => { bDlg.close(); if (window.HA_openPanel) window.HA_openPanel(d.p); });
      tx.appendChild(b); return;
    }
    if (d.act === 'resume') {
      const a = document.createElement('a'); a.className = 'btn btn-small'; a.href = 'resume/Adam_Bacchus_Resume.pdf'; a.target = '_blank'; a.rel = 'noopener'; a.textContent = '📄 Open the resume';
      tx.appendChild(a); return;
    }
    go.textContent = 'Take me there ↓';
    go.addEventListener('click', () => { bDlg.close(); goTo(d.go); });
    tx.appendChild(go);
  }
  function goTo(sel) {
    const t = $(sel); if (!t) return;
    requestAnimationFrame(() => t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }));
  }
  // the resume card: any link to the resume PDF counts
  document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a[href*="Adam_Bacchus_Resume.pdf"]'); if (a) earn('resume'); });

  function openBinder(celebrate) {
    renderBinder().then(() => {
      if (!bDlg.open) bDlg.showModal();
      bDetail.hidden = true;
      const s = $('#bdSave'); s.classList.toggle('glow', count() === TOTAL);
      if (celebrate) s.focus();
    });
  }
  binderBtn.addEventListener('click', () => openBinder());
  $('#bdSave').addEventListener('click', async () => {
    const cv = await renderBinderPNG();
    shareOrDownload(await toBlob(cv), 'hire-adam-binder.png', 'My Project: Hire Adam binder', `${count()}/${TOTAL} cards. ${SITE}`);
  });
  $('#bdReset').addEventListener('click', () => {
    if (!confirm('Reset your binder? Your cards will be cleared from this browser.')) return;
    st = { earned: {}, selfie: null }; selfieImg = null; cache.clear(); save();
    st.earned.adam = Date.now(); save();
    renderBar(); renderQuests(); renderBinder(); bDetail.hidden = true;
  });

  async function complete() {
    if (Date.now() - lastCascade > 60000) await cascade('You win!', `All ${TOTAL} cards${company ? ', ' + company : ''}. He shipped Spider Solitaire, so this ending was always going to bounce.`);
    toast('Binder complete. Save it and send it to your team.');
    openBinder(true);
  }

  /* ---------- the whole binder as one shareable PNG ---------- */
  async function renderBinderPNG() {
    const W = 1080, pad = 56, cols = 4, gap = 22, cw = (W - pad * 2 - gap * (cols - 1)) / cols, ch = cw * 1.4;
    const top = 262, H = Math.round(top + 4 * ch + 3 * gap + 96);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d'), n = count();
    x.fillStyle = C.ink; x.fillRect(0, 0, W, H);
    let g = x.createRadialGradient(W / 2, 120, 20, W / 2, 120, 700); g.addColorStop(0, 'rgba(123,92,255,.45)'); g.addColorStop(1, 'rgba(123,92,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 1;
    for (let i = 0; i < W; i += 36) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
    for (let i = 0; i < H; i += 36) { x.beginPath(); x.moveTo(0, i); x.lineTo(W, i); x.stroke(); }
    x.fillStyle = C.pink; x.font = `800 24px ${MONO}`; x.fillText('PROJECT: HIRE ADAM · COLLECTOR\'S BINDER', pad, 86);
    x.fillStyle = '#fff'; x.font = `900 78px ${FONT}`; x.fillText(n === TOTAL ? 'Complete set.' : `${n} of ${TOTAL} cards`, pad, 168);
    x.fillStyle = '#a7a3c2'; x.font = `700 28px ${FONT}`;
    const who = company ? `Collected by ${company}` : 'Collected at adambacch.us';
    fit(x, who, W - pad * 2 - 250, 28, 700); x.fillText(who, pad, 216);
    // progress pill
    rr(x, W - pad - 220, 120, 220, 54, 27); x.fillStyle = n === TOTAL ? C.green : 'rgba(255,255,255,.1)'; x.fill();
    x.fillStyle = n === TOTAL ? C.ink : '#fff'; x.font = `900 28px ${MONO}`; x.textAlign = 'center'; x.fillText(`${n}/${TOTAL}`, W - pad - 110, 157); x.textAlign = 'left';
    for (let i = 0; i < TOTAL; i++) {
      const d = CARDS[i], cx = pad + (i % cols) * (cw + gap), cy = top + Math.floor(i / cols) * (ch + gap);
      if (st.earned[d.id]) {
        x.save(); x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 18; x.shadowOffsetY = 8;
        x.drawImage(await drawMini(d), cx, cy, cw, ch); x.restore();
      } else {
        rr(x, cx, cy, cw, ch, 16); x.fillStyle = 'rgba(255,255,255,.05)'; x.fill();
        x.setLineDash([10, 8]); x.strokeStyle = 'rgba(255,255,255,.3)'; x.lineWidth = 3; x.stroke(); x.setLineDash([]);
        x.fillStyle = 'rgba(255,255,255,.35)'; x.font = `900 90px ${FONT}`; x.textAlign = 'center'; x.fillText('?', cx + cw / 2, cy + ch / 2 + 20);
        x.font = `700 18px ${MONO}`; x.fillText(RAR[d.r].label.toUpperCase(), cx + cw / 2, cy + ch - 26); x.textAlign = 'left';
      }
    }
    // contact panel in the last three slots
    const px = pad + (cw + gap), py = top + 3 * (ch + gap), pw = 3 * cw + 2 * gap;
    rr(x, px, py, pw, ch, 18); x.fillStyle = C.paper; x.fill();
    const qs = Math.min(ch - 60, 220);
    try { const q = await imgs.qr; x.imageSmoothingEnabled = false; x.drawImage(q, px + 30, py + (ch - qs) / 2, qs, qs); x.imageSmoothingEnabled = true; } catch { /* QR optional */ }
    const tx = px + qs + 60;
    x.fillStyle = C.pink; x.font = `800 18px ${MONO}`; x.fillText('NEXT ACTION', tx, py + 66);
    x.fillStyle = C.ink; x.font = `900 44px ${FONT}`; x.fillText('Hire Adam.', tx, py + 118);
    x.font = `700 24px ${FONT}`; x.fillStyle = '#4b4560';
    x.fillText('Adam Bacchus, PMP', tx, py + 166); x.fillText('Project manager · Houston, TX', tx, py + 200);
    x.fillStyle = C.ink; x.font = `800 24px ${MONO}`; x.fillText('adambacch.us', tx, py + 252);
    x.font = `600 19px ${MONO}`; x.fillStyle = '#4b4560'; x.fillText(EMAIL, tx, py + 284);
    if (n === TOTAL) {
      x.save(); x.translate(W - pad - 150, 60); x.rotate(0.12);
      x.strokeStyle = C.yellow; x.fillStyle = C.yellow; x.lineWidth = 5; rr(x, -120, -30, 240, 60, 12); x.stroke();
      x.font = `900 28px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('COMPLETE SET', 0, 2); x.restore();
    }
    x.fillStyle = 'rgba(255,255,255,.55)'; x.font = `600 20px ${MONO}`;
    x.fillText('Cards earned at adambacch.us. Rendered in your browser; nothing uploaded.', pad, H - 40);
    return cv;
  }


  /* =================================================================
     Big card viewer: earned cards only, ← → / swipe, flip, tilt, save
     ================================================================= */
  const vDlg = $('#viewerDlg'), vCard = $('#vwCard'), vTilt = $('#vwTilt'), vCv = $('#vwCanvas'), vBack = $('#vwBack');
  const vPos = $('#vwPos'), vTitle = $('#vwTitle'), vPrev = $('#vwPrev'), vNext = $('#vwNext');
  let vList = [], vIdx = 0, vReturn = null, vToken = 0, vSuppress = false;
  const earnedList = () => CARDS.filter((c) => st.earned[c.id]);
  function setFlip(on) {
    vCard.classList.toggle('flipped', on);
    vCard.setAttribute('aria-pressed', String(on));
    const d = vList[vIdx];
    if (d) vCard.setAttribute('aria-label', on
      ? `Back of ${d.name}: ${d.flavor} Press to flip to the front.`
      : `${d.name}, ${RAR[d.r].label} card. Press to flip to the back.`);
  }
  function buildBack(d) {
    vBack.dataset.r = d.r;
    vBack.innerHTML = '<span class="vb-frame"><span class="vb-top"><span class="vb-no"></span><span class="vb-logo" aria-hidden="true">AB</span></span>'
      + '<span class="vb-name"></span><span class="vb-r"></span><span class="vb-flavor"></span>'
      + '<span class="vb-k">Quest</span><span class="vb-q"></span><span class="vb-k">Collected</span><span class="vb-d"></span>'
      + '<span class="vb-foot">adambacch.us · Project: Hire Adam</span></span>';
    $('.vb-no', vBack).textContent = `No. ${String(d.no).padStart(2, '0')}/${TOTAL}`;
    $('.vb-name', vBack).textContent = d.name;
    $('.vb-r', vBack).textContent = `${RAR[d.r].glyph} ${RAR[d.r].label}`;
    $('.vb-flavor', vBack).textContent = d.flavor;
    $('.vb-q', vBack).textContent = d.hint;
    $('.vb-d', vBack).textContent = new Date(st.earned[d.id]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  async function vRender(dir) {
    const d = vList[vIdx], me = ++vToken;
    if (!d) return;
    vTitle.textContent = `${d.name} · ${RAR[d.r].label}`;
    vPos.textContent = `${vIdx + 1} / ${vList.length} collected`;
    const many = vList.length > 1;
    vPrev.disabled = vNext.disabled = !many;
    vCard.dataset.r = d.r;
    setFlip(false); buildBack(d);
    const src = await drawMini(d, 2);
    if (me !== vToken) return;
    const c = vCv.getContext('2d'); c.clearRect(0, 0, vCv.width, vCv.height); c.drawImage(src, 0, 0, vCv.width, vCv.height);
    vCard.classList.remove('in-l', 'in-r');
    if (dir && !reduced) { void vCard.offsetWidth; vCard.classList.add(dir > 0 ? 'in-r' : 'in-l'); }
  }
  function vGo(step) {
    if (vList.length < 2) return;
    vIdx = (vIdx + step + vList.length) % vList.length;
    vRender(step);
  }
  function openViewer(id, opener) {
    vList = earnedList();
    if (!vList.length) return;
    vIdx = Math.max(0, vList.findIndex((c) => c.id === id));
    vReturn = opener || document.activeElement;
    vRender(0);
    if (!vDlg.open) vDlg.showModal();
    vCard.focus();
  }
  vDlg.addEventListener('close', () => {
    setFlip(false); resetTilt();
    const r = vReturn; vReturn = null;
    if (r && r.isConnected && typeof r.focus === 'function') setTimeout(() => r.focus(), 0);
  });
  $('#vwClose').addEventListener('click', () => vDlg.close());
  vPrev.addEventListener('click', () => vGo(-1));
  vNext.addEventListener('click', () => vGo(1));
  $('#vwFlip').addEventListener('click', () => setFlip(!vCard.classList.contains('flipped')));
  vCard.addEventListener('click', () => { if (vSuppress) { vSuppress = false; return; } setFlip(!vCard.classList.contains('flipped')); });
  $('#vwSave').addEventListener('click', async () => {
    const d = vList[vIdx]; if (!d) return;
    const cv = await drawMini(d, 2);
    shareOrDownload(await toBlob(cv), `hire-adam-card-${String(d.no).padStart(2, '0')}-${d.id}.png`, `${d.name} · Project: Hire Adam`, `${d.name} (${RAR[d.r].label}). ${SITE}`);
  });
  // keyboard: ← → browse, Tab stays inside (Esc closes natively)
  vDlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); vGo(e.key === 'ArrowLeft' ? -1 : 1); return; }
    if (e.key !== 'Tab') return;
    const f = $$('button:not([disabled]), a[href]', vDlg).filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  // tilt (mouse hover) + swipe (touch or mouse drag)
  const vs = vTilt.style;
  function resetTilt() { ['--rx', '--ry', '--dx', '--rz'].forEach((k) => vs.removeProperty(k)); vs.setProperty('--mx', '50%'); vs.setProperty('--my', '50%'); vs.setProperty('--hyp', '0'); vTilt.classList.remove('drag'); }
  function tiltTo(px, py) {
    px = clamp(px, 0, 1); py = clamp(py, 0, 1);
    vs.setProperty('--ry', ((px - 0.5) * 24).toFixed(2) + 'deg');
    vs.setProperty('--rx', (-(py - 0.5) * 24).toFixed(2) + 'deg');
    vs.setProperty('--mx', (px * 100).toFixed(1) + '%');
    vs.setProperty('--my', (py * 100).toFixed(1) + '%');
    vs.setProperty('--hyp', clamp(Math.hypot(px - 0.5, py - 0.5) * 2.2, 0, 1).toFixed(3));
  }
  let sw = null;
  vCard.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    sw = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
  });
  vCard.addEventListener('pointermove', (e) => {
    const r = vCard.getBoundingClientRect();
    if (sw && sw.id === e.pointerId) {
      const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
      if (!sw.moved && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { sw.moved = true; try { vCard.setPointerCapture(e.pointerId); } catch { /* fine */ } }
      if (sw.moved) {
        vTilt.classList.add('drag');
        vs.setProperty('--dx', (reduced ? 0 : dx) + 'px');
        vs.setProperty('--rz', (reduced ? 0 : dx * 0.03).toFixed(2) + 'deg');
        tiltTo(0.5 + clamp(dx / r.width, -0.5, 0.5), 0.5);
      }
      return;
    }
    if (e.pointerType === 'mouse') tiltTo((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  });
  const endSwipe = (e) => {
    if (!sw || sw.id !== e.pointerId) return;
    const dx = e.clientX - sw.x, moved = sw.moved;
    sw = null; resetTilt();
    if (moved) { vSuppress = true; setTimeout(() => { vSuppress = false; }, 400); if (Math.abs(dx) > 50) vGo(dx < 0 ? 1 : -1); }
  };
  vCard.addEventListener('pointerup', endSwipe);
  vCard.addEventListener('pointercancel', (e) => { sw = null; resetTilt(); });
  vCard.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !sw) resetTilt(); });
  resetTilt();

  /* =================================================================
     Quest hooks from app.js (flip, exam, selfie, console)
     ================================================================= */
  document.addEventListener('ha:quest', (e) => {
    const { id, canvas } = e.detail || {};
    if (id === 'selfie' && canvas) {
      // thumbnail of THEIR selfie (with cardboard Adam) for the Met Adam card
      const t = document.createElement('canvas'); t.width = 360; t.height = 282;
      drawCover(t.getContext('2d'), canvas, 0, 0, 360, 282, 0.5, 0.35);
      let thumb = null; try { thumb = t.toDataURL('image/jpeg', 0.78); } catch { /* tainted */ }
      earn('selfie', thumb ? { thumb } : null);
      return;
    }
    earn(id);
  });

  window.binder = () => {
    earn('hacker');
    console.table(CARDS.map((c) => ({ no: c.no, card: st.earned[c.id] ? c.name : '???', rarity: RAR[c.r].label, collected: !!st.earned[c.id] })));
    return `${count()}/${TOTAL} collected. Close devtools to watch the card land.`;
  };

  /* =================================================================
     Joke: Roll to hire (game-master toolkit)
     ================================================================= */
  (() => {
    const d20 = $('#d20'), num = $('#d20Num'), out = $('#d20Out'), res = $('#d20Res'), btn = $('#d20Roll');
    const lines = [
      'Natural 20. Critical success: the hiring committee is persuaded.',
      'Natural 20 again. Before you ask: the dice were audited.',
      'Still 20. The rules database has been consulted, and the book says hire Adam.',
      'Twenty. At this point the DC is a formality.',
    ];
    let rolls = 0, rolling = false;
    btn.addEventListener('click', () => {
      if (rolling) return;
      rolling = true; rolls++;
      d20.classList.remove('crit'); res.textContent = '…'; res.className = 'd20-res';
      out.textContent = 'Rolling…';
      const finish = () => {
        num.textContent = '20'; d20.classList.add('crit'); d20.classList.remove('roll');
        res.textContent = '20 ✓ success'; res.className = 'd20-res ok';
        out.textContent = lines[(rolls - 1) % lines.length];
        btn.textContent = '🎲 Roll again';
        rolling = false; earn('nat20');
      };
      if (reduced) { finish(); return; }
      d20.classList.remove('roll'); void d20.offsetWidth; d20.classList.add('roll');
      const t0 = performance.now(); let lastN = 0;
      const spin = (t) => {
        if (t - t0 < 1150) { if (t - lastN > 75) { num.textContent = String(1 + Math.floor(Math.random() * 19)); lastN = t; } requestAnimationFrame(spin); } else finish();
      };
      requestAnimationFrame(spin);
    });
  })();

  /* =================================================================
     Joke: Bid on Adam (budgeted auction assistant)
     ================================================================= */
  (() => {
    const PERKS = ['one salary', 'one salary + a desk by the window', 'one salary + fewer meetings', 'one salary + a team that writes good tickets',
      'one salary + a sponsor who answers email', 'one salary + no “quick syncs”', 'one salary + a real coffee machine', 'one salary + everything above, again'];
    const bidEl = $('#aucBid'), whoEl = $('#aucWho'), timeEl = $('#aucTime'), msg = $('#aucMsg'), hist = $('#aucHist'), btn = $('#aucBidBtn');
    const ASSIST = 'Adam’s auction assistant';
    let level = 0, who = '', end = 0, iv = 0, snipes = 0, state = 'idle', twistT = 0;
    const perk = () => PERKS[Math.min(level, PERKS.length - 1)];
    function addHist(name, text, snipe) {
      hist.hidden = false;
      const li = document.createElement('li'); if (snipe) li.className = 'snipe';
      const b = document.createElement('b'); b.textContent = name;
      li.append(b, ' · ' + text);
      hist.prepend(li);
      while (hist.children.length > 4) hist.lastElementChild.remove();
    }
    const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `0:${String(s).padStart(2, '0')}`; };
    function tick() {
      const left = end - Date.now();
      timeEl.textContent = fmt(left);
      timeEl.classList.toggle('hot', left < 4000);
      if (state === 'you' && left > 1000) msg.textContent = left <= 2000 ? 'Going twice…' : left <= 3500 ? 'Going once…' : 'I have one bid. Do I hear more?';
      if (state === 'you' && left <= 1000) snipe();
      if (left <= 0) { clearInterval(iv); ended(); }
    }
    function snipe() {
      state = 'sniped'; level++; snipes++;
      who = ASSIST; bidEl.textContent = perk(); whoEl.textContent = ASSIST;
      addHist(ASSIST, perk(), true);
      $('#wp-auction').classList.remove('flash'); void $('#wp-auction').offsetWidth; $('#wp-auction').classList.add('flash', 'snipe-up');
      msg.textContent = '⚡ Sniped at 0:01. Adam’s auction assistant bids at the last second, inside a fixed monthly budget and never above its price cap.';
      earn('sniped');
    }
    function ended() {
      state = 'ended';
      timeEl.textContent = 'closed'; timeEl.classList.remove('hot');
      document.dispatchEvent(new Event('ha:gavel'));
      btn.textContent = 'Relist and bid again';
      msg.textContent = 'Auction closed.';
      // let the loss land before the twist
      clearTimeout(twistT);
      twistT = setTimeout(() => {
        who = 'you'; whoEl.textContent = 'you';
        addHist(ASSIST, 'plot twist: was bidding for you all along');
        msg.innerHTML = '<b class="auc-twist">Plot twist: the assistant was working for you.</b><br><span class="auc-win">You won Adam.</span> ';
        const sc = document.createElement('button'); sc.type = 'button'; sc.className = 'auc-contact'; sc.textContent = '🎟 Your lot ticket · save contact';
        sc.addEventListener('click', () => { if (window.HA_openContact) window.HA_openContact(); });
        msg.appendChild(sc);
        $('#wp-auction').classList.add('won');
      }, reduced ? 1500 : 3500);
    }
    btn.addEventListener('click', () => {
      if (state === 'sniped') return;
      // The clock starts on the first bid of a listing; raising doesn't touch it.
      const fresh = state === 'idle' || state === 'ended';
      if (fresh) { clearTimeout(twistT); $('#wp-auction').classList.remove('won', 'snipe-up'); }
      level++; state = 'you'; who = 'you';
      bidEl.textContent = perk(); whoEl.textContent = 'you';
      addHist('You', perk());
      msg.textContent = 'You are the high bidder. Hold steady…';
      btn.classList.remove('up'); void btn.offsetWidth; btn.classList.add('up');
      btn.textContent = 'Raise bid';
      if (fresh) { end = Date.now() + 8000; clearInterval(iv); iv = setInterval(tick, 200); tick(); }
    });
  })();

  /* =================================================================
     Joke: WIP limit (Learn Jam production system). Put the right task into Doing.
     Drag (mouse, pen, touch), tap a card then tap Doing, or Enter/Space on a card.
     "Hire Adam" lands, glows, slides on to Done → Right Priority. Other tasks bounce back.
     ================================================================= */
  (() => {
    const board = $('#kbBoard'), todoEl = $('#kbTodo'), doingEl = $('#kbDoing'), doneEl = $('#kbDone'), msg = $('#wipMsg'), resetBtn = $('#wipReset');
    const LABEL = { hire: 'Hire Adam <small>(you)</small>', resumes: 'Read other résumés', panel: 'Schedule a panel' };
    const START = ['hire', 'resumes', 'panel'];
    const WRONG = ['Not now. WIP limit: 1. Choose wisely.', 'Bounced. Doing holds one task, so make it the one that matters.', 'Still not it. Hint: the yellow one.'];
    let todo = START.slice(), doing = null, won = false, selected = null, busy = false, lastPointer = 0, wrongs = 0;
    const T = (ms) => (reduced ? 0 : ms);
    function cardBtn(id, extra) {
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'kb-card kb-grab' + (id === 'hire' ? ' hot' : '') + (extra ? ' ' + extra : '');
      b.dataset.t = id; b.innerHTML = LABEL[id];
      b.setAttribute('aria-label', b.textContent.trim() + '. Press to move into Doing.');
      if (selected === id) { b.classList.add('selected'); b.setAttribute('aria-pressed', 'true'); }
      return b;
    }
    function render(doingClass) {
      [todoEl, doingEl, doneEl].forEach((col) => $$('.kb-card, .kb-slot', col).forEach((x) => x.remove()));
      todo.forEach((id) => todoEl.appendChild(cardBtn(id)));
      if (doing) { const d = cardBtn(doing, doingClass); d.disabled = true; doingEl.appendChild(d); }
      else { const s = document.createElement('span'); s.className = 'kb-slot'; s.textContent = selected ? 'Tap here to drop it' : 'Drop one task here'; doingEl.appendChild(s); }
      ['PMP ✓', 'Read this far ✓'].forEach((t) => { const s = document.createElement('span'); s.className = 'kb-card done'; s.textContent = t; doneEl.appendChild(s); });
      if (won) { const s = document.createElement('span'); s.className = 'kb-card done hot kb-won' + (doingClass === 'landed' ? '' : ''); s.innerHTML = 'Hire Adam ✓ <small>(you)</small>'; doneEl.appendChild(s); }
      doingEl.classList.toggle('armed', !!selected);
    }
    function place(id) {
      if (busy || !todo.includes(id)) return;
      selected = null; busy = true;
      todo = todo.filter((x) => x !== id); doing = id;
      if (id === 'hire') {
        render('landed'); doingEl.classList.add('glow');
        msg.textContent = 'That’s the one.';
        setTimeout(() => {
          doing = null; won = true; doingEl.classList.remove('glow');
          render(); doneEl.classList.remove('party'); void doneEl.offsetWidth; doneEl.classList.add('party');
          msg.textContent = 'Right call: one task in progress, and it was the one worth doing. Hire Adam ✓';
          resetBtn.hidden = false; busy = false;
          earn('wip');
        }, T(900));
      } else {
        render('bounce');
        msg.textContent = WRONG[Math.min(wrongs++, WRONG.length - 1)];
        setTimeout(() => { doing = null; todo.splice(START.indexOf(id), 0, id); todo = START.filter((x) => todo.includes(x)); render(); busy = false; }, T(800));
      }
    }
    function select(id) {
      if (busy) return;
      selected = selected === id ? null : id;
      render();
      msg.textContent = selected ? 'Now tap Doing to move it there.' : 'Pick the one task worth doing.';
      const b = selected && todoEl.querySelector(`[data-t="${selected}"]`); if (b) b.focus();
    }
    // pointer drag / tap
    let st = null;
    board.addEventListener('pointerdown', (e) => {
      const card = e.target.closest('.kb-grab'); if (!card || card.disabled || busy || e.button > 0 || !todoEl.contains(card)) return;
      st = { card, id: card.dataset.t, x: e.clientX, y: e.clientY, pid: e.pointerId, moved: false };
      try { card.setPointerCapture(e.pointerId); } catch { /* fine */ }
    });
    board.addEventListener('pointermove', (e) => {
      if (!st || st.pid !== e.pointerId) return;
      const dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.moved && Math.hypot(dx, dy) > 6) { st.moved = true; st.card.classList.add('dragging'); doingEl.classList.add('armed'); }
      if (st.moved) st.card.style.transform = reduced ? '' : `translate(${dx}px, ${dy}px) rotate(${Math.max(-6, Math.min(6, dx / 14))}deg)`;
      if (st.moved) { const r = doingEl.getBoundingClientRect(); doingEl.classList.toggle('over', e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top - 20 && e.clientY <= r.bottom + 20); }
    });
    const endDrag = (e) => {
      if (!st || st.pid !== e.pointerId) return;
      const s = st; st = null; lastPointer = performance.now();
      s.card.classList.remove('dragging'); s.card.style.transform = ''; doingEl.classList.remove('over');
      if (!s.moved) { select(s.id); return; }
      doingEl.classList.remove('armed');
      const r = doingEl.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top - 20 && e.clientY <= r.bottom + 20) place(s.id);
      else msg.textContent = 'Drop it into the Doing column.';
    };
    board.addEventListener('pointerup', endDrag);
    board.addEventListener('pointercancel', (e) => { if (st && st.pid === e.pointerId) { st.card.classList.remove('dragging'); st.card.style.transform = ''; st = null; doingEl.classList.remove('over', 'armed'); } });
    board.addEventListener('click', (e) => {
      const card = e.target.closest('.kb-grab');
      if (card && todoEl.contains(card)) { if (performance.now() - lastPointer > 600) place(card.dataset.t); return; } // keyboard Enter/Space
      if (selected && e.target.closest('#kbDoing')) place(selected);
    });
    resetBtn.addEventListener('click', () => { todo = START.slice(); doing = null; won = false; selected = null; wrongs = 0; render(); msg.textContent = 'Pick the one task worth doing.'; resetBtn.hidden = true; });
    render();
  })();

  /* =================================================================
     Application to employ Adam: POSTs JSON to APPLY_ENDPOINT (see top)
     ================================================================= */
  (() => {
    const form = $('#revForm'), status = $('#rvStatus'), send = $('#rvSend'), hp = $('#rvHp');
    const f = { name: $('#rvName'), email: $('#rvEmail'), company: $('#rvCompany'), role: $('#rvRole'), message: $('#rvWhy') };
    const LABEL = '📨 Send application';
    const live = !!APPLY_ENDPOINT;
    if (company) f.company.value = company;
    const say2 = (kind, html) => { status.className = 'rev-status ' + kind; status.innerHTML = html; };
    const emailText = `<b class="rev-addr">${EMAIL}</b>`;
    if (!live) {
      send.textContent = '📨 Form not live yet: show Adam’s email';
      say2('info', `This form is not live yet. Until it is, email Adam directly at ${emailText}.`);
    }
    const okEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    Object.values(f).forEach((el) => el.addEventListener('input', () => el.removeAttribute('aria-invalid')));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = Object.fromEntries(Object.entries(f).map(([k, el]) => [k, el.value.trim()]));
      const bad = [];
      if (!v.name) bad.push([f.name, 'your name']);
      if (!okEmail(v.email)) bad.push([f.email, v.email ? 'a valid email address' : 'your email']);
      Object.values(f).forEach((el) => el.removeAttribute('aria-invalid'));
      if (bad.length) {
        bad.forEach(([el]) => el.setAttribute('aria-invalid', 'true'));
        say2('err', 'Please add ' + bad.map((x) => x[1]).join(' and ') + '.');
        bad[0][0].focus();
        return;
      }
      if (!live) {
        say2('info', `Not sent: this form is not live yet. Please email your application to ${emailText}. <button type="button" class="linkbtn" id="rvCopy">Copy my application</button>`);
        $('#rvCopy').addEventListener('click', () => HA.copy(
          `Application to employ Adam\n\nName: ${v.name}\nEmail: ${v.email}\nCompany: ${v.company}\nRole: ${v.role}\n\n${v.message}`, 'Application copied. Paste it into an email to Adam.'));
        earn('applicant');
        return;
      }
      send.disabled = true; send.textContent = 'Sending…'; say2('busy', 'Sending your application…');
      try {
        const r = await fetch(APPLY_ENDPOINT, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          // `website` is the honeypot: people never see it, bots fill it, the endpoint drops those
          body: JSON.stringify({ name: v.name, email: v.email, company: v.company, role: v.role, message: v.message, page: location.href, website: hp.value }),
        });
        let data = null; try { data = await r.json(); } catch { /* non-JSON */ }
        if (!r.ok || !data || data.ok !== true) { const err = new Error('HTTP ' + r.status); err.status = r.status; throw err; }
        send.textContent = '✓ Sent';
        say2('ok', `Sent. Adam will reply to <b></b>.`); $('b', status).textContent = v.email;
        f.message.value = '';
        earn('applicant');
        setTimeout(() => { send.disabled = false; send.textContent = LABEL; }, 4000);
      } catch (err) {
        send.disabled = false; send.textContent = '↻ Try again';
        const why = {
          422: 'Something in the form did not pass the check. Please look over your name and email.',
          429: 'Too many applications from this connection in the last hour. Please try again later.',
          413: 'That message is too long. Please shorten it a little.',
          403: 'This page is not allowed to send applications from here.',
        }[err && err.status] || 'It did not go through (network or server problem).';
        say2('err', `Not sent. ${why} You can always email Adam directly at ${emailText}.`);
      }
    });
  })();

  /* =================================================================
     Joke: "Hear Adam say your company's name" (voice cloning slot)
     Plays media/voice/<slug>.mp3, else media/voice/generic.mp3, else the button stays hidden.
     ================================================================= */
  (async () => {
    const btn = $('#voiceBtn');
    const slug = (company || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const ok = async (u) => {
      try { const r = await fetch(u, { method: 'HEAD' }); return r.ok && /audio|mpeg|octet/.test(r.headers.get('content-type') || 'audio/mpeg'); } catch { return false; }
    };
    let src = null, named = false;
    if (slug && await ok(`media/voice/${slug}.mp3`)) { src = `media/voice/${slug}.mp3`; named = true; }
    else if (await ok('media/voice/generic.mp3')) src = 'media/voice/generic.mp3';
    if (!src) return;
    btn.textContent = named ? `🔊 Hear Adam say “${company}”` : '🔊 Hear Adam say hello';
    btn.hidden = false;
    let audio = null;
    btn.addEventListener('click', () => {
      audio = audio || new Audio(src);
      if (!audio.paused) { audio.pause(); audio.currentTime = 0; return; }
      audio.currentTime = 0;
      audio.play().then(() => btn.classList.add('playing')).catch(() => toast('Your browser blocked audio. Try again?'));
      audio.onended = () => btn.classList.remove('playing');
    });
  })();

  /* =================================================================
     Joke: unified input controller (Konami code / shake → hireAdam())
     ================================================================= */
  const SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  const GLYPH = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', b: 'B', a: 'A' };
  let keys = [], lastKonami = 0, actx = null;
  function feed(k) {
    k = k.length === 1 ? k.toLowerCase() : k;
    keys.push(k); if (keys.length > SEQ.length) keys.shift();
    const padSeq = $('#padSeq'); if (padSeq) padSeq.textContent = keys.map((x) => GLYPH[x] || '·').join('') || '—';
    if (keys.join() === SEQ.join()) { keys = []; konami('keyboard'); }
  }
  function jingle() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
    } catch { return; }
    const t0 = actx.currentTime + 0.03, master = actx.createGain();
    master.gain.value = 0.07; master.connect(actx.destination);
    [[523.25, 0], [659.25, 0.09], [783.99, 0.18], [1046.5, 0.27], [783.99, 0.4], [1046.5, 0.49]].forEach(([fq, at], i, a) => {
      const o = actx.createOscillator(), e = actx.createGain(), s = t0 + at, len = i === a.length - 1 ? 0.55 : 0.11;
      o.type = 'square'; o.frequency.value = fq;
      e.gain.setValueAtTime(0.0001, s); e.gain.exponentialRampToValueAtTime(1, s + 0.01); e.gain.exponentialRampToValueAtTime(0.0001, s + len);
      o.connect(e); e.connect(master); o.start(s); o.stop(s + len + 0.05);
    });
  }
  const mapper = $('#mapper');
  let mapT = 0;
  function konami(source) {
    if (Date.now() - lastKonami < 3000) return;
    lastKonami = Date.now();
    $('#mpSrc').textContent = `source: ${source} · output: one project manager`;
    $('#mpSeq').textContent = source === 'shake' ? '📳 shake' : '↑↑↓↓←→←→BA';
    mapper.classList.remove('show'); mapper.classList.add('open'); topLayer(mapper);
    requestAnimationFrame(() => mapper.classList.add('show'));
    if (source !== 'shake') jingle();
    clearTimeout(mapT); mapT = setTimeout(hideMapper, 6500);
    earn('konami');
  }
  function hideMapper() { mapper.classList.remove('show', 'open'); try { if (mapper.matches(':popover-open')) mapper.hidePopover(); } catch { /* fine */ } }
  $('#mpPlay').addEventListener('click', jingle);
  $('#mpClose').addEventListener('click', hideMapper);
  addEventListener('keydown', (e) => {
    if (e.target && e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    feed(e.key);
  });
  // phone shake (devicemotion). iOS asks permission; we piggyback on the existing "Enable tilt" tap.
  let shakes = [];
  function onMotion(e) {
    const a = e.acceleration && e.acceleration.x != null ? e.acceleration : null;
    const g = e.accelerationIncludingGravity;
    const m = a ? Math.hypot(a.x, a.y, a.z) : g ? Math.abs(Math.hypot(g.x, g.y, g.z) - 9.81) : 0;
    if (m < 18) return;
    const t = performance.now(); shakes = shakes.filter((s) => t - s < 1000); shakes.push(t);
    if (shakes.length >= 4) { shakes = []; konami('shake'); }
  }
  if (typeof DeviceMotionEvent !== 'undefined') {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      document.addEventListener('ha:motion', () => addEventListener('devicemotion', onMotion), { once: true }); // granted on the first card tap (app.js)
    } else if (coarse) addEventListener('devicemotion', onMotion);
  }
  // touch-friendly inputs for the two secret cards (shown inside the binder)
  function buildPad() {
    const w = document.createElement('div'); w.className = 'pad';
    w.innerHTML = '<p class="pad-k">Input mapper · any input, any output</p><div class="pad-grid"></div><p class="pad-seq" aria-live="polite">Entered: <b id="padSeq">—</b></p>';
    const grid = $('.pad-grid', w);
    [['ArrowUp', '↑', 'Up'], ['ArrowLeft', '←', 'Left'], ['ArrowRight', '→', 'Right'], ['ArrowDown', '↓', 'Down'], ['b', 'B', 'B'], ['a', 'A', 'A']].forEach(([k, g, l]) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pad-key pad-' + l.toLowerCase(); b.textContent = g; b.setAttribute('aria-label', l);
      b.addEventListener('click', () => feed(k)); grid.appendChild(b);
    });
    return w;
  }
  function buildMiniConsole() {
    const w = document.createElement('form'); w.className = 'mini-con';
    w.innerHTML = '<p class="pad-k">No devtools on this device? Here is a console.</p><label class="mc-row"><span aria-hidden="true">&gt;</span><input autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Console command" placeholder="try gantt()"></label><pre class="mc-out" aria-live="polite"></pre>';
    const inp = $('input', w), outp = $('.mc-out', w);
    w.addEventListener('submit', (e) => {
      e.preventDefault();
      const c = inp.value.trim().replace(/;$/, '');
      if (c === 'gantt()') outp.textContent = 'Shuffleware  2016–2018  4 iOS card games; studio acquired\nAvabyte      2018–2020  7 concurrent apps, up to 20 devs\nBrowsea      2021–now   ~50 apps as one program\nPMP          Aug 2026   passed\nHire Adam    next       float: 0 days';
      else if (c === 'hireAdam()') outp.textContent = '📨 Escalated. (In a real console this opens your email.)';
      else if (c === 'binder()') outp.textContent = `${count()}/${TOTAL} collected.`;
      else { outp.textContent = `ReferenceError: ${c || '(nothing)'} is not defined. Try gantt(), hireAdam() or binder().`; return; }
      earn('hacker');
    });
    return w;
  }

  // for extras.js: a win plays the solitaire cascade, then the card lands
  window.HAQ = { earn, has: (id) => !!st.earned[id], selfie: () => st.selfie, win: (id, title, sub) => { enqueue(() => cascade(title, sub)); earn(id); } };

  /* =================================================================
     Boot: first card on arrival, then render
     ================================================================= */
  renderBar(); renderQuests();
  if (!st.earned.adam) {
    st.earned.adam = Date.now(); save();
    setTimeout(() => {
      renderBar(); renderQuests(); bump();
      toast(`🃏 First card collected (1/${TOTAL}).`);
    }, 2200);
  }
})();
