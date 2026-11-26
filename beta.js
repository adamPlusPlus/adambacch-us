/* adambacch.us/beta: motion for the FeatSpec art. Never touches the quests; only adds classes and CSS variables.
   built  = the panel has assembled itself (entrance), idle = its loop animations run, off = paused off screen,
   --px/--py = parallax input (-1..1) from the pointer or, on touch screens, from scroll position. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const panels = [...document.querySelectorAll('#comicStrip .panel')];
  if (reduced || !('IntersectionObserver' in window)) {
    panels.forEach((p) => p.classList.add('built', 'idle'));
    return;
  }
  document.documentElement.classList.add('b-anim');

  /* ---------- entrance, then idle; pause loops off screen ---------- */
  const BUILD_MS = 1600;
  const build = (p) => {
    if (p.classList.contains('built')) return;
    p.classList.add('built');
    setTimeout(() => p.classList.add('idle'), BUILD_MS);
  };
  const seen = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { build(e.target); seen.unobserve(e.target); }
  }), { threshold: 0.35 });
  const vis = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('off', !e.isIntersecting)), { rootMargin: '80px' });
  panels.forEach((p) => {
    seen.observe(p); vis.observe(p);
    const z = document.createElement('span'); z.className = 'b-zoom'; z.setAttribute('aria-hidden', 'true'); p.appendChild(z);
    // an opened panel (deep link, history) must never sit unbuilt
    new MutationObserver(() => { if (p.classList.contains('open')) { build(p); p.style.setProperty('--px', 0); p.style.setProperty('--py', 0); } })
      .observe(p, { attributes: true, attributeFilter: ['class'] });
  });

  /* ---------- push-in flash as a quest opens ---------- */
  panels.forEach((p) => {
    const btn = p.querySelector('.panel-btn');
    btn.addEventListener('click', () => {
      if (p.classList.contains('open')) return;
      p.classList.remove('pushing'); void p.offsetWidth; p.classList.add('pushing');
      setTimeout(() => p.classList.remove('pushing'), 800);
    }, true);
  });

  /* ---------- parallax ---------- */
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const set = (p, x, y) => { p.style.setProperty('--px', x.toFixed(3)); p.style.setProperty('--py', y.toFixed(3)); };
  if (fine) {
    panels.forEach((p) => {
      const btn = p.querySelector('.panel-btn');
      btn.addEventListener('pointermove', (e) => {
        if (p.classList.contains('open')) return;
        const r = btn.getBoundingClientRect();
        set(p, ((e.clientX - r.left) / r.width - 0.5) * 2, ((e.clientY - r.top) / r.height - 0.5) * 2);
      });
      btn.addEventListener('pointerleave', () => set(p, 0, 0));
    });
  }
  // scroll depth: every panel drifts with its position in the viewport (touch screens have no hover)
  const hero = document.querySelector('.beta-hero-art');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const vh = innerHeight;
    if (!fine) panels.forEach((p) => {
      if (p.classList.contains('open') || p.classList.contains('off')) return;
      const r = p.getBoundingClientRect();
      const k = Math.max(-1, Math.min(1, ((r.top + r.height / 2) / vh - 0.5) * 2));
      set(p, 0, k);
    });
    if (hero) hero.style.setProperty('--hs', Math.min(scrollY, vh).toFixed(1));
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- hero: the diamonds lean toward the pointer ---------- */
  const heroSec = document.querySelector('.hero');
  if (fine && hero && heroSec) {
    heroSec.addEventListener('pointermove', (e) => {
      hero.style.setProperty('--hx', ((e.clientX / innerWidth) - 0.5).toFixed(3));
      hero.style.setProperty('--hy', ((e.clientY / innerHeight) - 0.5).toFixed(3));
    });
    heroSec.addEventListener('pointerleave', () => { hero.style.setProperty('--hx', 0); hero.style.setProperty('--hy', 0); });
  }

  /* ---------- the rest of the page: sections below the fold rise in once ---------- */
  const rise = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('seen'); rise.unobserve(e.target); }
  }), { threshold: 0.12 });
  document.querySelectorAll('#report > .sheet:not(#comic)').forEach((s) => {
    if (s.hidden || s.getBoundingClientRect().top < innerHeight) return;
    s.classList.add('b-pre'); rise.observe(s);
  });
})();
