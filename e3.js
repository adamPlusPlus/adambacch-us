/* adambacch.us/beta: panel 2 ("Roll to hire") as a first-person takeover. As the quest opens, comic.js's camera
   centres the acquirer; Adam turns his back to us where he stood, and the camera pushes into the back of his head:
   the back view swells past the frame, blurs and fades, and we are looking through his eyes at the acquirer.
   A faint vignette and a slow breathing drift keep the first-person feel. Closing runs it backwards.
   Only adds layers to the panel and toggles classes; the d20 quest itself is untouched. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const p = document.getElementById('panel-2');
  if (!p) return;
  const btn = p.querySelector('.panel-btn');
  const front = () => p.querySelector('.panel-btn svg > use.pose-shake');
  let back = null, vig = null, anim = null, vAnim = null, fAnim = null, was = false, start = null, retT = 0;

  function ensure() {
    if (back) return;
    back = document.createElement('img');
    back.className = 'e3-back'; back.alt = ''; back.setAttribute('aria-hidden', 'true');
    back.src = 'art/p2g.webp';
    vig = document.createElement('span');
    vig.className = 'e3-vig'; vig.setAttribute('aria-hidden', 'true');
    btn.append(back, vig);
  }
  const box = (el) => { const br = btn.getBoundingClientRect(), r = el.getBoundingClientRect(); return { left: r.left - br.left, top: r.top - br.top, w: r.width, h: r.height }; };
  const place = (r) => Object.assign(back.style, { left: r.left + 'px', top: r.top + 'px', width: r.w + 'px', height: r.h + 'px' });

  // the camera passes through his head: the point between his ears goes to the middle of the quest box and grows
  // until the picture is far bigger than the box (sized from the box, so every window gets the same move)
  function through(r) {
    const W = btn.clientWidth, H = btn.clientHeight;
    const S = Math.max(W / (r.w * 0.6), H / (r.h * 0.3)) * 1.6; // the head (about 60% of the width, top 30%) overfills the box
    const hx = r.w * 0.5, hy = r.h * 0.16;
    return `translate(${(W * 0.5 - r.left - S * hx).toFixed(1)}px, ${(H * 0.42 - r.top - S * hy).toFixed(1)}px) scale(${S.toFixed(2)})`;
  }

  function openPOV() {
    ensure();
    clearTimeout(retT); p.classList.remove('pov-return');
    const f = front();
    start = f ? box(f) : { left: btn.clientWidth * 0.1, top: btn.clientHeight * 0.3, w: btn.clientWidth * 0.3, h: btn.clientHeight * 0.6 };
    p.classList.add('pov');
    if (anim) anim.cancel(); if (vAnim) vAnim.cancel();
    if (reduced) { back.style.opacity = 0; vig.style.opacity = 0.35; return; }
    // when the comic cross-fades into the quest (comic.js opens inside a view transition), let that finish first
    const lag = document.documentElement.classList.contains('ha-vt-open') ? 450 : 0;
    // the front view turns away first (scripted, so its timing cannot shift when the open's cross-fade ends)
    if (f) {
      if (fAnim) fAnim.cancel();
      fAnim = f.animate([{ transform: 'scaleX(1)', opacity: 1 }, { transform: 'scaleX(.05)', opacity: 1, offset: 0.9 }, { transform: 'scaleX(.05)', opacity: 0 }],
        { duration: 380, delay: lag + 60, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'both' });
    }
    const go = () => {
      // keep his proportions inside the spot the front-facing figure took
      // he stands where the front view stood, kept inside the box: the opened art puts his feet below its bottom
      // edge, so his back view keeps his spot across but stands tall enough for head and shoulders to read
      const ar = back.naturalWidth / back.naturalHeight || 0.48, W = btn.clientWidth, H = btn.clientHeight;
      const sheet = p.classList.contains('sheet-mode');
      const cx = sheet ? Math.min(W * 0.5, Math.max(W * 0.32, start.left + start.w / 2)) : Math.min(W * 0.45, Math.max(W * 0.2, start.left + start.w / 2));
      const h = H * (sheet ? 0.6 : 0.85), w = h * ar, r = { left: cx - w / 2, top: H * (sheet ? 0.32 : 0.3), w, h };
      place(r);
      // first the turn (the camera holds still), then one continuous move: the camera travels to the acquirer
      // (comic.js's framing, delayed in beta.css to start at 0.7 s) while it passes through the back of his head
      anim = back.animate([
        { offset: 0, opacity: 0, transform: 'scale(.02, 1)', filter: 'blur(0px)' },
        { offset: 0.22, opacity: 1, transform: 'scale(1, 1)', filter: 'blur(0px)' },            // he turns his back to us
        { offset: 0.3, opacity: 1, transform: 'scale(1, 1)', filter: 'blur(0px)' },
        { offset: 0.82, opacity: 0.85, transform: through(r), filter: 'blur(3px)' },            // the camera reaches his head
        { offset: 1, opacity: 0, transform: through(r).replace(/scale\(([\d.]+)\)/, (m, s) => `scale(${(s * 1.35).toFixed(2)})`), filter: 'blur(14px)' },
      ], { duration: 2000, delay: 130 + lag, easing: 'cubic-bezier(.45,0,.35,1)', fill: 'both' });
      // the moment of passing through: the edges darken, then settle into a faint first-person vignette
      vAnim = vig.animate([{ opacity: 0 }, { opacity: 0, offset: 0.72 }, { opacity: 0.9, offset: 0.88 }, { opacity: 0.35 }],
        { duration: 2100, delay: 130 + lag, easing: 'ease-in-out', fill: 'forwards' });
      anim.onfinish = () => { back.style.visibility = 'hidden'; };
    };
    back.style.visibility = '';
    if (back.complete && back.naturalWidth) go(); else back.addEventListener('load', go, { once: true });
  }

  // closing, the exact reverse: pull back out of his head while the camera eases off the acquirer (comic.js
  // drops the framing at the same moment); the panel then folds back into the comic (comic.js's view transition)
  // and he turns round to face us again during that fold
  let pulled = false;
  function pullBack() {
    if (!back || !p.classList.contains('pov') || pulled) return 0;
    pulled = true;
    if (anim) anim.cancel(); if (vAnim) vAnim.cancel();
    if (reduced) { back.style.opacity = 0; vig.style.opacity = 0; return 0; }
    const r = { left: parseFloat(back.style.left), top: parseFloat(back.style.top), w: parseFloat(back.style.width), h: parseFloat(back.style.height) };
    back.style.visibility = '';
    vAnim = vig.animate([{ opacity: 0.35 }, { opacity: 0 }], { duration: 380, fill: 'forwards' });
    anim = back.animate([
      { opacity: 0, transform: through(r), filter: 'blur(10px)' },
      { opacity: 1, transform: 'scale(1, 1)', filter: 'blur(0px)' },
    ], { duration: 400, easing: 'cubic-bezier(.3,0,.3,1)', fill: 'forwards' });
    return 420;
  }
  window.HA_e3Out = pullBack;

  new MutationObserver(() => {
    const on = p.classList.contains('open') && !p.classList.contains('closing');
    if (on && !was) { pulled = false; openPOV(); }
    if (!on && was) pullBack();
    if (!p.classList.contains('open') && p.classList.contains('pov')) {
      if (anim) anim.cancel(); if (vAnim) vAnim.cancel(); if (fAnim) { fAnim.cancel(); fAnim = null; }
      p.classList.remove('pov'); p.classList.add('pov-return');
      clearTimeout(retT); retT = setTimeout(() => p.classList.remove('pov-return'), 600);
    }
    was = on;
  }).observe(p, { attributes: true, attributeFilter: ['class'] });
})();
