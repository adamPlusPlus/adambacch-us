/* adambacch.us/beta: panel 4's islands as places. Clicking an island on the sea chart zooms the chart into it and
   cross-fades into that island's own multiplane scene (far plate, landmark, a screen playing the work's clip, a sign
   with its description). Closing zooms back out onto the same island. comic.js calls window.HA_isle.open(); the
   quest's own bookkeeping (seen islands, the count, the card) stays in comic.js.
   Art: FeatSpec set adambacch-us, sections island-plates (far) and islands (cut-out layers). */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MEDIA = 'https://browsea.surf/media/';
  // the work's clip per island (browsea.surf/media). ?v= is the clip's file mtime in seconds, base 36, from
  // browsea-site/media/<name>.mp4: Cloudflare caches media, so refresh a stamp whenever that clip is re-recorded.
  const CLIP = {
    delivery: ['meatybee-tour-v2', 'tnu8i6'], ai: ['comic-pipeline-explainer-v2', 'tnumki'], learning: ['stoody-full-v2', 'tnujwg'],
    docs: ['formwise-tour-v2', 'tnu9v4'], games: ['gm-toolkit-tour-v2', 'tnukr8'], ops: ['auction-assistant-tour-v2', 'tnu8ll'], rnd: ['eink-browser-concept-v2', 'tnu809'],
  };
  // chapters of the long Stoody tour, shown as small buttons under its screen
  const CHAPTERS = { learning: [[0, 'Tour'], [59.43, 'Language'], [115, 'Blocks'], [152.4, 'Subjects'], [202.67, 'Modes'], [250.94, 'Adventure']] };
  const src = (id, ext) => { const [c, v] = CLIP[id]; return MEDIA + c + '.' + ext + (v ? '?v=' + v : ''); };
  // art files and where the blank screen / sign face sit inside each cut-out (fractions of the picture: x, y, w, h)
  const KEY = { delivery: 'del', ai: 'ai', learning: 'learn', docs: 'docs', games: 'games', ops: 'ops', rnd: 'rnd' };
  const BOX = window.HA_ISLE_BOXES || {};
  const PLACE = { delivery: 'Harbour', ai: 'Lighthouse', learning: 'Library tower', docs: 'Archive', games: 'Carnival pier', ops: 'Engine room', rnd: 'Cliff lab' };

  // browsea.surf has no deep links yet: its logbook always opens on one island and ignores the URL. The link carries
  // the island and the entry's title as query parameters (harmless today) and lands on the logbook.
  // points at the browsea.surf beta (which reads island and entry) until it goes live; then drop /beta
  const SITE = (i) => 'https://browsea.surf/?src=adambacch&island=' + encodeURIComponent(i.id) + '&entry=' + encodeURIComponent(i.t) + '#logbook';
  let scene = null, cur = null, P4 = null, zoomEls = [];

  function build(i) {
    const k = KEY[i.id], b = BOX[k] || {};
    const sb = b.screen || [0.2, 0.2, 0.6, 0.5], gb = b.sign || [0.15, 0.2, 0.7, 0.55];
    const el = document.createElement('dialog');
    el.className = 'isle-scene';
    el.dataset.isle = i.id;
    el.setAttribute('aria-label', `Island ${i.n}: ${i.name}. ${i.t}`);
    el.innerHTML = `
      <div class="is-cam">
        <img class="is-l is-far" src="art/isles/${k}-far.jpg" alt="" decoding="async">
        <img class="is-l is-mid" src="art/isles/${k}-mid.webp" alt="" decoding="async">
        <div class="is-l is-screen${i.id === 'ai' ? ' round' : ''}" style="--ar:${b.screenAr || 1.33}"><img src="art/isles/${k}-screen.webp" alt="" decoding="async">
          <div class="is-vbox" style="left:${sb[0] * 100}%;top:${sb[1] * 100}%;width:${sb[2] * 100}%;height:${sb[3] * 100}%">
            <div class="is-vframe" title="Play full screen"><video muted loop playsinline preload="none" ${reduced ? 'controls' : ''} poster="${src(i.id, 'jpg')}" aria-label="Clip: ${i.t}"></video></div>
          </div>
          ${CHAPTERS[i.id] ? `<div class="is-chapters" role="group" aria-label="Chapters">${CHAPTERS[i.id].map(([t, n]) => `<button type="button" data-t="${t}">${n}</button>`).join('')}</div>` : ''}
        </div>
        <div class="is-l is-sign" style="--ar:${b.signAr || 1.33}" role="button" tabindex="0" aria-haspopup="dialog" aria-label="${i.t}: ${i.d} Open it on browsea.surf"><img src="art/isles/${k}-sign.webp" alt="" decoding="async">
          <div class="is-tbox" style="left:${gb[0] * 100}%;top:${gb[1] * 100}%;width:${gb[2] * 100}%;height:${gb[3] * 100}%">
            <p class="is-kick">Island ${i.n} · ${i.name}</p><h4 class="is-title">${i.t}</h4><p class="is-desc">${i.d}</p>
          </div>
        </div>
      </div>
      <p class="is-place" aria-hidden="true">${PLACE[i.id]}</p>
      <button type="button" class="is-back">← Back to the chart</button>
      <p class="is-hint" aria-hidden="true">Click the scene to go back</p>
      <div class="is-ask" role="alertdialog" aria-modal="false" aria-labelledby="isAskQ" hidden>
        <p class="is-ask-q" id="isAskQ">Open ${i.t} on browsea.surf?</p>
        <div class="is-ask-row"><button type="button" class="is-yes">Yes</button><button type="button" class="is-stay">Stay</button></div>
      </div>`;
    return el;
  }

  function fitText(el) {
    // shrink the sign's text until it fits its blank face
    const box = el.querySelector('.is-tbox'); if (!box) return;
    let f = parseFloat(getComputedStyle(box).getPropertyValue('--fs')) || 1;
    box.style.setProperty('--fs', 1);
    f = 1;
    for (let n = 0; n < 12 && box.scrollHeight > box.clientHeight + 1 && f > 0.55; n++) { f -= 0.05; box.style.setProperty('--fs', f.toFixed(2)); }
  }

  // the clip's frame takes the clip's own aspect: as large as fits in the prop's screen area, centred on it.
  // When that would leave much of the area empty (a round lens, a tall cabinet), the framed screen grows a little
  // past the area so it reads as a monitor mounted in front of the prop. The video inside is never cropped.
  function fitVideo() {
    if (!scene) return;
    const box = scene.querySelector('.is-vbox'), fr = scene.querySelector('.is-vframe'), v = scene.querySelector('video');
    const W = box.clientWidth, H = box.clientHeight; if (!W || !H) return;
    const ar = v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 1.6;
    let w = W / H > ar ? H * ar : W, h = w / ar;
    const fill = (w * h) / (W * H);
    if (fill < 0.72) { const k = Math.min(1.3, Math.sqrt(0.72 / fill)); w *= k; h *= k; }
    // never larger than the scene can show (a tall phone recording in a short landscape window)
    const sc = scene.getBoundingClientRect(), bs = box.getBoundingClientRect().width / W || 1;
    const lim = Math.min(1, (sc.height * 0.8) / (h * bs), (sc.width * 0.9) / (w * bs));
    w *= lim; h *= lim;
    Object.assign(fr.style, { width: w.toFixed(1) + 'px', height: h.toFixed(1) + 'px', left: ((W - w) / 2).toFixed(1) + 'px', top: ((H - h) / 2).toFixed(1) + 'px' });
    // and kept inside the scene: shift it back in if it would run past an edge
    const r = fr.getBoundingClientRect(), m = 8;
    let dx = 0, dy = 0;
    if (r.top < sc.top + m) dy = sc.top + m - r.top; else if (r.bottom > sc.bottom - m) dy = sc.bottom - m - r.bottom;
    if (r.left < sc.left + m) dx = sc.left + m - r.left; else if (r.right > sc.right - m) dx = sc.right - m - r.right;
    if (dx || dy) Object.assign(fr.style, { left: (parseFloat(fr.style.left) + dx / bs).toFixed(1) + 'px', top: (parseFloat(fr.style.top) + dy / bs).toFixed(1) + 'px' });
    fr.classList.toggle('mounted', fill < 0.72);
    fr.classList.toggle('phone', ar < 0.8); // a phone recording gets a phone's frame
  }
  function layout() {
    if (!scene) return;
    const r = scene.getBoundingClientRect();
    scene.dataset.shape = r.width / r.height >= 1.15 ? 'wide' : 'tall';
    fitText(scene);
    fitVideo();
  }

  // zoom the chart (svg art + the island overlay) about the island's point on screen, using the individual
  // `scale`/`translate` properties so the quest camera's own transform stays untouched
  function zoomChart(on, pt) {
    zoomEls.forEach((e) => {
      if (!on) { e.style.scale = ''; e.style.translate = ''; return; }
      // the element's own (untransformed) origin: both sit at the top left of their parent's padding box
      const par = e.parentElement, pr = par.getBoundingClientRect();
      const ox = pr.left + par.clientLeft, oy = pr.top + par.clientTop;
      const px = pt.x - ox, py = pt.y - oy, s = 5;
      e.style.translate = `${((1 - s) * px).toFixed(1)}px ${((1 - s) * py).toFixed(1)}px`;
      e.style.scale = String(s);
    });
  }

  function onMove(e) {
    if (!scene || reduced) return;
    const r = scene.getBoundingClientRect();
    scene.style.setProperty('--mx', (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
    scene.style.setProperty('--my', (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
  }
  function onTilt(e) {
    if (!scene || reduced || e.gamma == null) return;
    scene.style.setProperty('--mx', Math.max(-1, Math.min(1, e.gamma / 25)).toFixed(3));
    scene.style.setProperty('--my', Math.max(-1, Math.min(1, (e.beta - 45) / 25)).toFixed(3));
  }

  function open(i, el) {
    P4 = document.getElementById('panel-4');
    if (!P4 || !P4.classList.contains('open')) return false;
    if (scene) teardown();
    cur = { i, el };
    scene = build(i);
    document.body.appendChild(scene);
    scene.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    try { scene.showModal(); } catch (e) { scene.setAttribute('open', ''); }
    document.documentElement.classList.add('isle-lock');
    zoomEls = [P4.querySelector('.panel-btn svg'), P4.querySelector('.st-over')].filter(Boolean);
    const r = el.getBoundingClientRect();
    const pt = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    P4.classList.add('isle-open');
    layout();
    scene.querySelectorAll('img').forEach((im) => { if (!im.complete) im.addEventListener('load', layout, { once: true }); });
    setTimeout(layout, 1200); // after the arrival transition settles
    // lazy video: the clip loads only now
    const v = scene.querySelector('video');
    v.addEventListener('loadedmetadata', fitVideo);
    v.src = src(i.id, 'mp4');
    if (!reduced) v.play().catch(() => {});
    scene.querySelector('.is-back').addEventListener('click', close);
    // tap the screen for the clip at full size
    scene.querySelectorAll('.is-chapters button').forEach((b) => b.addEventListener('click', () => {
      v.currentTime = +b.dataset.t; if (!reduced) v.play().catch(() => {});
      scene.querySelectorAll('.is-chapters button').forEach((x) => x.classList.toggle('on', x === b));
    }));
    scene.querySelector('.is-vframe').addEventListener('click', () => {
      try { if (v.requestFullscreen) v.requestFullscreen().then(() => { v.controls = true; }).catch(() => {}); else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen(); } catch (e) { /* stay in the scene */ }
    });
    v.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) v.controls = reduced; });
    // the sign offers browsea.surf; the confirm sits in the scene
    const ask = scene.querySelector('.is-ask'), sign = scene.querySelector('.is-sign');
    const showAsk = () => { ask.hidden = false; scene.classList.add('asking'); scene.querySelector('.is-yes').focus({ preventScroll: true }); };
    const hideAsk = () => { ask.hidden = true; scene.classList.remove('asking'); sign.focus({ preventScroll: true }); };
    sign.addEventListener('click', showAsk);
    sign.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showAsk(); } });
    scene.querySelector('.is-stay').addEventListener('click', hideAsk);
    scene.querySelector('.is-yes').addEventListener('click', () => { window.open(SITE(i), '_blank', 'noopener'); hideAsk(); });
    ask.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hideAsk(); } });
    // a plain tap or click on empty scenery goes back to the chart; a drag, swipe or long press does not
    let down = null;
    // the scenery itself is a tap target, so a phone's touch adjustment does not snap a tap on empty
    // scenery onto the nearby screen or sign
    scene.querySelector('.is-cam').addEventListener('click', () => {});
    scene.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; });
    scene.addEventListener('pointercancel', () => { down = null; });
    scene.addEventListener('pointerup', (e) => {
      const d = down; down = null;
      if (!d || d.id !== e.pointerId || e.button > 0) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || performance.now() - d.t > 600) return;
      if (e.target.closest('.is-vframe, .is-sign, .is-back, .is-ask, .is-chapters')) return;
      if (!ask.hidden) { hideAsk(); return; }
      close();
    });
    scene.addEventListener('pointermove', onMove);
    addEventListener('deviceorientation', onTilt);
    addEventListener('resize', layout);
    if (reduced) { scene.classList.add('in'); }
    else {
      P4.classList.add('isle-zooming');
      zoomChart(true, pt);
      requestAnimationFrame(() => requestAnimationFrame(() => scene && scene.classList.add('in')));
    }
    setTimeout(() => { if (scene) scene.querySelector('.is-back').focus({ preventScroll: true }); }, reduced ? 0 : 700);
    return true;
  }

  function teardown() {
    if (!scene) return;
    const v = scene.querySelector('video'); if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
    try { scene.close(); } catch (e) { /* already closed */ }
    scene.remove(); scene = null;
    document.documentElement.classList.remove('isle-lock');
    removeEventListener('deviceorientation', onTilt);
    removeEventListener('resize', layout);
    if (P4) P4.classList.remove('isle-open', 'isle-zooming');
    zoomChart(false);
  }

  function close() {
    if (!scene) return;
    const s = scene, back = cur && cur.el;
    const v = s.querySelector('video'); if (v) v.pause();
    s.classList.remove('in'); s.classList.add('out');
    zoomChart(false); // the chart's transition carries it back out, landing on the island it left
    setTimeout(() => {
      if (scene === s) teardown();
      if (back) back.focus({ preventScroll: true });
    }, reduced ? 200 : 750);
  }

  // the quest closing (✕, skip, Back) takes the scene with it
  document.addEventListener('DOMContentLoaded', () => {
    const p = document.getElementById('panel-4'); if (!p) return;
    new MutationObserver(() => { if (scene && !p.classList.contains('open')) teardown(); }).observe(p, { attributes: true, attributeFilter: ['class'] });
  });

  window.HA_isle = { open, close, isOpen: () => !!scene };
})();
