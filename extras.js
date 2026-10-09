/* adambacch.us — four tucked-away extras. Zero dependencies, nothing leaves the browser.
   1. Check the fit   (link under the Gantt, or ?fit)  keyword match of a job description against Adam's resume
   2. Spider half-deck  (comic panel 1)               one-suit, pre-arranged, winnable; win → cascade + card
   3. E-ink mode        (footer toggle)               grayscale e-paper, no motion, page-turn pagination */
(() => {
  'use strict';
  const HA = window.HA, Q = window.HAQ;
  if (!HA) return;
  const { $, $$, toast, copy, reduced, coarse, EMAIL } = HA;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function makeDialog(id, cls, label, inner) {
    const d = document.createElement('dialog');
    d.className = 'modal ' + cls; d.id = id; d.setAttribute('aria-labelledby', id + 'T');
    d.innerHTML = `<form method="dialog" class="modal-x"><button aria-label="Close ${esc(label)}">✕</button></form>${inner}`;
    document.body.appendChild(d);
    return d;
  }

  /* =================================================================
     1. Check the fit
     Requirements dictionary built from the base resume. `ev` is the resume line that supports a match;
     `ev: null` means the resume has no evidence, so a job that asks for it gets "Not found in resume".
     ================================================================= */
  const SINCE = 2016; // leading delivery since Jan 2016 (Shuffleware → Avabyte → Browsea)
  const FIT = [
    { sec: 'Credentials', items: [
      { k: 'PMP certification', re: /\bpmp\b|project management professional/, ev: 'Project Management Professional (PMP), PMI, issued Aug 2026' },
      { k: 'Bachelor’s degree (Computer Science)', re: /bachelor|\bb\.?s\.?c?\b(?! *\/)|\bdegree\b|computer science/, ev: 'B.S. in Computer Science, Minor in Mathematics, University of Houston (2016)' },
      { k: 'Master’s degree or MBA', re: /master'?s|\bmba\b/, ev: null },
      { k: 'Scrum certification (CSM / PSM)', re: /\bcsm\b|\bpsm\b|certified scrum ?master|professional scrum master/, ev: null },
      { k: 'SAFe certification', re: /scaled agile|\bsafe\s*(?:agilist|certif|framework|®|\d)/, ev: null },
      { k: 'PMI-ACP', re: /pmi-?acp/, ev: null },
      { k: 'PRINCE2', re: /prince ?2/, ev: null },
      { k: 'ITIL', re: /\bitil\b/, ev: null },
      { k: 'Six Sigma', re: /six sigma/, ev: null },
      { k: 'Professional license (e.g. RN, PE, CPA)', re: /\blicen[cs]e[ds]?\b|\bbls\b|\bacls\b/, ev: null },
    ] },
    { sec: 'Project management', items: [
      { k: 'Scheduling, timelines and milestones', re: /schedul|timeline|baseline|milestone|gantt|critical path/, ev: 'Skills: scheduling and baselines; held a release schedule set by the advertising budget (Avabyte)' },
      { k: 'Work breakdown (WBS)', re: /work breakdown|\bwbs\b/, ev: 'Skills: work breakdown' },
      { k: 'Scope and change control', re: /\bscope\b|change control|change requests?|change management/, ev: 'Skills: scope and change control; cut Formwise scope to a live-demo MVP' },
      { k: 'Risk management', re: /\brisks?\b|risk register|mitigat|\braid\b/, ev: 'Kept a nine-item risk register (Formwise); skills: risk registers' },
      { k: 'Budget and cost control', re: /budget|cost control|cost management|forecast/, ev: 'Final authority on budget and resource allocation (Shuffleware)' },
      { k: 'Resource allocation', re: /resource (?:allocation|planning|management)|capacity planning|staffing/, ev: 'Built a staffing and multi-project tracking tool to assign work by each developer’s strengths (Avabyte)' },
      { k: 'Stakeholder management and reporting', re: /stakeholder|status report|executive (?:report|updates|communication)|reporting/, ev: 'Skills: stakeholder reporting; schedules, trackers and status dashboards (Browsea)' },
      { k: 'Portfolio / multiple concurrent projects', re: /portfolio|program management|multiple (?:projects|programs)|multi-project|concurrent|prioriti[sz]/, ev: 'Managed a portfolio of 20+ product initiatives; runs about 50 applications as one program (Browsea)' },
      { k: 'Release, delivery and acceptance', re: /\breleases?\b|go-live|launch|end-to-end delivery|acceptance|\buat\b/, ev: 'Seven concurrent apps through release and formal acceptance (Avabyte); concept to App Store launch (Shuffleware)' },
      { k: 'Quality assurance', re: /\bqa\b|quality assurance|quality management|code review/, ev: 'Led product-level QA; introduced code review and written delivery guidelines (Avabyte)' },
      { k: 'Negotiation', re: /negotiat/, ev: 'Led the negotiations that brought the studio into Avabyte through acquisition (Shuffleware)' },
      { k: 'Dependency management', re: /dependenc/, ev: null },
      { k: 'Vendor management / procurement', re: /vendor|supplier|procure|contract management/, ev: null },
    ] },
    { sec: 'Methods', items: [
      { k: 'Agile / Scrum', re: /\bagile\b|\bscrum\b|\bsprints?\b/, ev: 'Skills: Agile/Scrum and kanban' },
      { k: 'Kanban', re: /kanban|\bwip\b/, ev: 'Skills: Agile/Scrum and kanban' },
      { k: 'Waterfall / predictive', re: /waterfall|predictive|hybrid (?:methodolog|delivery)/, ev: null },
      { k: 'Software development lifecycle', re: /\bsdlc\b|software development|software delivery|engineering teams?|development teams?/, ev: 'Lead Software Engineer; took 5 to 20 developers through release (Avabyte)' },
    ] },
    { sec: 'Leadership and teams', items: [
      { k: 'Offshore / distributed teams', re: /offshore|distributed|remote teams?|global teams?|time ?zones?|nearshore|outsourc/, ev: 'Led a mostly offshore team of up to 20 developers; shifted hours to overlap offshore time zones (Avabyte)' },
      { k: 'Team leadership', re: /lead(?:ing)? (?:a |the )?teams?|team lead|leadership|manage (?:a |the )?teams?/, ev: 'Led up to 20 developers (Avabyte); led a three-person team to a competition-ready MVP (Formwise)' },
      { k: 'Cross-functional coordination', re: /cross-?functional|multidisciplinary/, ev: 'Coordinated the client’s designer, comic artist, animator and writer (AI production pipeline)' },
      { k: 'Mentoring', re: /mentor|coach/, ev: 'Mentored developers to independent delivery (Avabyte)' },
      { k: 'Client-facing delivery', re: /\bclients?\b|customer-facing|customer facing/, ev: 'Delivered an AI production pipeline for an independent comics publisher (Browsea)' },
      { k: 'People management (direct reports, hiring)', re: /direct reports|people management|line management|hiring|performance reviews/, ev: null },
    ] },
    { sec: 'Tools', items: [
      { k: 'Microsoft Project', re: /ms project|microsoft project/, ev: 'Tools: Microsoft Project' },
      { k: 'Excel', re: /\bexcel\b/, ev: 'Tools: Excel' },
      { k: 'Power BI', re: /power ?bi/, ev: 'Tools: Power BI' },
      { k: 'Jira', re: /\bjira\b/, ev: 'Tools: Jira/Confluence' },
      { k: 'Confluence', re: /confluence/, ev: 'Tools: Jira/Confluence' },
      { k: 'Trello', re: /trello/, ev: 'Tools: Trello; ran a tracking tool alongside Trello and Slack (Avabyte)' },
      { k: 'Git', re: /\bgit\b|github|gitlab/, ev: 'Tools: Git' },
      { k: 'Slack', re: /\bslack\b/, ev: 'Ran a tracking tool alongside Trello and Slack (Avabyte)' },
      { k: 'Smartsheet', re: /smartsheet/, ev: null },
      { k: 'Asana', re: /\basana\b/, ev: null },
      { k: 'Azure DevOps', re: /azure devops/, ev: null },
      { k: 'ServiceNow', re: /servicenow/, ev: null },
      { k: 'Tableau', re: /tableau/, ev: null },
      { k: 'Salesforce', re: /salesforce/, ev: null },
    ] },
    { sec: 'Domain', items: [
      { k: 'Healthcare / clinical', re: /clinical|patient care|acute care|\bicu\b|hospital|nursing/, ev: null },
      { k: 'Financial services', re: /banking|financial services|fintech|trading desk/, ev: null },
      { k: 'Construction', re: /construction site|general contractor|\bconstruction\b/, ev: null },
    ] },
    { sec: 'Technical', items: [
      { k: 'Python', re: /\bpython\b/, ev: 'Technical: Python' },
      { k: 'JavaScript / TypeScript', re: /javascript|typescript/, ev: 'Technical: JavaScript/TypeScript' },
      { k: 'SQL', re: /\bsql\b/, ev: 'Technical: SQL' },
      { k: 'C# / Unity', re: /c#|\bunity\b/, ev: 'Technical: C#/Unity; Unity integration in the AI production pipeline' },
      { k: 'AI / machine learning', re: /\bai\b|artificial intelligence|machine learning|\bllms?\b|generative/, ev: 'AI production pipeline (generative fill, voice cloning); directs AI coding agents from written specifications' },
      { k: 'Mobile apps (iOS)', re: /\bios\b|mobile app|app store/, ev: 'Four iOS card games from concept to App Store launch (Shuffleware)' },
      { k: 'Games', re: /\bgam(?:e|es|ing)\b/, ev: 'Four iOS card games; seven ad-supported game and entertainment apps (Avabyte)' },
      { k: 'Data and analytics', re: /analytics|dashboards?|\bkpis?\b|metrics/, ev: 'Built the analytics for the acquisition (Shuffleware); status dashboards (Browsea)' },
      { k: 'Cloud (AWS / Azure / GCP)', re: /\baws\b|\bazure\b(?! devops)|\bgcp\b|google cloud/, ev: null },
    ] },
  ];
  const CANT = [
    [/clearance|ts\/sci|public trust/, 'Security clearance'],
    [/on-?site|in[- ]office|hybrid(?! (?:methodolog|delivery))|relocat|commut/, 'On-site / hybrid / relocation (Adam is based in Houston, TX)'],
    [/salary|compensation|pay range|\$\s?\d|per hour|\/hr\b/, 'Salary and compensation'],
    [/\btravel\b/, 'Travel requirements'],
    [/authoriz|sponsorship|citizen|\bvisa\b|green card/, 'Work authorization / sponsorship'],
    [/background check|drug (?:test|screen)/, 'Background or drug screening'],
  ];
  function analyze(text) {
    const t = ' ' + text.toLowerCase().replace(/\s+/g, ' ') + ' ';
    const sections = [], matched = [], missing = [], cant = [];
    FIT.forEach((s) => {
      let req = 0, hit = 0;
      s.items.forEach((it) => {
        if (!it.re.test(t)) return;
        req++;
        if (it.ev) { hit++; matched.push({ sec: s.sec, k: it.k, ev: it.ev }); } else missing.push({ sec: s.sec, k: it.k });
      });
      if (req) sections.push({ sec: s.sec, req, hit });
    });
    // years of experience
    const yrs = [...t.matchAll(/(\d{1,2})\s*\+?\s*(?:(?:-|–|to)\s*\d{1,2}\s*)?\+?\s*years?/g)].map((m) => +m[1]).filter((n) => n > 0 && n < 40);
    if (yrs.length) {
      const need = Math.max(...yrs), have = Math.floor(new Date().getFullYear() + new Date().getMonth() / 12 - SINCE);
      const sec = sections.find((x) => x.sec === 'Experience') || (sections.push({ sec: 'Experience', req: 0, hit: 0 }), sections[sections.length - 1]);
      sec.req++;
      if (have >= need) { sec.hit++; matched.push({ sec: 'Experience', k: `${need}+ years of experience`, ev: `About ${have} years leading delivery: Shuffleware (2016–2018), Avabyte (2018–2020), Browsea (2021–present)` }); }
      else missing.push({ sec: 'Experience', k: `${need}+ years of experience (resume shows about ${have})` });
    }
    CANT.forEach(([re, label]) => { if (re.test(t)) cant.push(label); });
    const req = sections.reduce((a, s) => a + s.req, 0), hit = sections.reduce((a, s) => a + s.hit, 0);
    const pct = req ? Math.round((hit / req) * 100) : 0;
    const verdict = req < 3 ? 'Not enough recognizable requirements to score. Paste the full job description.'
      : pct >= 75 ? 'Strong match' : pct >= 55 ? 'Good partial match' : pct >= 35 ? 'Partial match' : 'Weak match';
    return { sections, matched, missing, cant, req, hit, pct, verdict };
  }
  function reportText(r) {
    const L = [`Fit check: Adam Bacchus, PMP`, `Coverage: ${r.hit}/${r.req} recognized requirements (${r.pct}%) · ${r.verdict}`, ''];
    r.sections.forEach((s) => L.push(`${s.sec}: ${s.hit}/${s.req}`));
    if (r.matched.length) { L.push('', 'Matched'); r.matched.forEach((m) => L.push(`✓ ${m.k}: ${m.ev}`)); }
    if (r.missing.length) { L.push('', 'Not found in resume'); r.missing.forEach((m) => L.push(`✗ ${m.k}`)); }
    if (r.cant.length) { L.push('', 'Couldn’t assess from a resume'); r.cant.forEach((c) => L.push(`? ${c}`)); }
    L.push('', 'Adam Bacchus · Houston, TX · ' + EMAIL + ' · https://adambacch.us');
    return L.join('\n');
  }
  const fitDlg = makeDialog('fitDlg', 'modal-fit', 'fit check', `
    <p class="sec-id">Fit check · Spec quality, but for hiring</p>
    <h2 id="fitDlgT">Check the fit</h2>

    <label class="field" for="fitJD">Paste a job description</label>
    <textarea id="fitJD" class="fit-jd" rows="7" placeholder="Paste the job description here…"></textarea>
    <div class="share-row"><button type="button" class="btn btn-small btn-approve" id="fitRun">🎯 Check the fit</button><button type="button" class="btn btn-small btn-ghost" id="fitClear">Clear</button></div>
    <div class="fit-report" id="fitReport" aria-live="polite" hidden></div>`);
  const fitJD = $('#fitJD'), fitReport = $('#fitReport');
  let lastReport = null;
  function renderReport(r) {
    lastReport = r;
    const bar = (hit, req) => `<span class="fit-bar"><span style="width:${req ? Math.round((hit / req) * 100) : 0}%"></span></span>`;
    const tone = r.req < 3 ? 'none' : r.pct >= 75 ? 'hi' : r.pct >= 55 ? 'mid' : 'lo';
    fitReport.innerHTML = `
      <div class="fit-meter fit-${tone}"><span class="fit-pct">${r.req >= 3 ? r.pct + '%' : '—'}</span><span class="fit-v">${esc(r.verdict)}<small>${r.hit} of ${r.req} recognized requirements found in the resume</small></span></div>
      ${bar(r.hit, r.req).replace('fit-bar', 'fit-bar fit-bar-big')}
      <ul class="fit-secs">${r.sections.map((s) => `<li><span class="fs-k">${esc(s.sec)}</span>${bar(s.hit, s.req)}<span class="fs-n">${s.hit}/${s.req}</span></li>`).join('')}</ul>
      ${r.matched.length ? `<h3 class="fit-h ok">Matched</h3><ul class="fit-list">${r.matched.map((m) => `<li><b>✓ ${esc(m.k)}</b><span>${esc(m.ev)}</span></li>`).join('')}</ul>` : ''}
      ${r.missing.length ? `<h3 class="fit-h no">Not found in resume</h3><ul class="fit-list">${r.missing.map((m) => `<li><b>✗ ${esc(m.k)}</b></li>`).join('')}</ul>` : ''}
      ${r.cant.length ? `<h3 class="fit-h q">Couldn’t assess from a resume</h3><ul class="fit-list">${r.cant.map((c) => `<li><b>? ${esc(c)}</b></li>`).join('')}</ul>` : ''}
      <p class="fit-note">Requirements it doesn’t recognize aren’t counted.</p>
      <div class="share-row"><button type="button" class="btn btn-small" id="fitCopy">📋 Copy report</button><button type="button" class="btn btn-small btn-ghost" id="fitContact">📇 Save contact</button></div>`;
    fitReport.hidden = false;
    $('#fitCopy').addEventListener('click', () => copy(reportText(lastReport), 'Report copied'));
    $('#fitContact').addEventListener('click', () => { fitDlg.close(); if (window.HA_openContact) setTimeout(window.HA_openContact, 50); });
  }
  $('#fitRun').addEventListener('click', () => {
    const v = fitJD.value.trim();
    if (v.length < 40) { toast('Paste a job description first (a few lines at least).'); fitJD.focus(); return; }
    renderReport(analyze(v));
    fitReport.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
  });
  $('#fitClear').addEventListener('click', () => { fitJD.value = ''; fitReport.hidden = true; fitJD.focus(); });
  function openFit() { if (!fitDlg.open) { fitDlg.showModal(); if (window.bm) bm('fit'); } fitJD.focus(); }
  $$('[data-open-fit]').forEach((b) => b.addEventListener('click', openFit));
  if (new URLSearchParams(location.search).has('fit')) setTimeout(openFit, 300);
  window.HAX = { analyze, reportText };

  /* =================================================================
     3. Spider Solitaire mini-deal: one suit, pre-arranged, ~8 moves
     ================================================================= */
  const DEAL = [[13, 12, 11, 10, 9], [3, 8], [5, 7, 2], [1, 6, 4]];
  const RANK = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
  // renders inside comic panel 1 (#spMount); falls back to a modal if the mount is missing
  const spMount = $('#spMount');
  const spHTML = `
    <h3 id="spDlgT" class="sr-only">Spider half-deck</h3>
    <p class="sr-only" id="spSay" aria-live="polite">Build King down to Ace.</p>
    <div class="sp-board" id="spBoard"></div>
    <div class="sp-foot"><p class="ccap sp-status" id="spStatus" aria-live="polite">Moves: 0</p><button type="button" class="ccap ccap-btn" id="spHint">👉 hint</button><button type="button" class="sp-deck" id="spReset" aria-label="Shuffle and redeal"><span class="sp-deck-i" aria-hidden="true">🔀</span></button></div>`;
  let spDlg = null;
  if (spMount) spMount.innerHTML = spHTML; else spDlg = makeDialog('spDlg', 'modal-spider', 'Spider Solitaire', spHTML);
  const board = $('#spBoard'), spStatus = $('#spStatus'), spSay = $('#spSay') || spStatus;
  let cols = [], moves = 0, won = false, dragging = null, lastPointer = 0;
  const runOk = (col, i) => { for (let j = i + 1; j < col.length; j++) if (col[j] !== col[j - 1] - 1) return false; return true; };
  const canDrop = (run, dest) => !cols[dest].length || cols[dest][cols[dest].length - 1] === run[0] + 1;
  function spRender() {
    board.innerHTML = '';
    const bh = board.clientHeight || 340;
    cols.forEach((col, ci) => {
      const colEl = document.createElement('div'); colEl.className = 'sp-col'; colEl.dataset.c = ci;
      colEl.setAttribute('aria-label', `Column ${ci + 1}` + (col.length ? '' : ', empty'));
      const cw = colEl.style; void cw;
      col.forEach((r, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'sp-card'; b.dataset.c = ci; b.dataset.i = i;
        const name = (RANK[r] || r) + ' of spades';
        const movable = runOk(col, i);
        b.disabled = !movable && !won;
        if (!movable) b.classList.add('locked');
        b.setAttribute('aria-label', name + (movable ? '. Tap to move.' : ''));
        b.innerHTML = `<span class="sp-r">${RANK[r] || r}</span><span class="sp-s">♠</span><span class="sp-big" aria-hidden="true">${RANK[r] || r}</span>`;
        b.style.setProperty('--i', i); b.style.setProperty('--c', ci);
        colEl.appendChild(b);
      });
      board.appendChild(colEl);
    });
    // fit tall columns into the board
    const cardH = ($('.sp-card', board) || { offsetHeight: 100 }).offsetHeight || 100;
    $$('.sp-col', board).forEach((colEl, ci) => {
      const n = cols[ci].length, off = n > 1 ? Math.min(cardH * 0.3, (bh - cardH - 4) / (n - 1)) : 0;
      colEl.style.setProperty('--off', off + 'px');
    });
    spStatus.textContent = won ? `Solved in ${moves} moves. King to Ace.` : `Moves: ${moves}`;
  }
  function doMove(from, i, to) {
    const run = cols[from].splice(i);
    cols[to].push(...run);
    moves++;
    const full = cols.findIndex((col) => col.length === 13 && col.every((r, k) => r === 13 - k));
    spRender();
    if (full >= 0 && !won) {
      won = true;
      spRender();
      spStatus.textContent = `Solved in ${moves} moves. King to Ace.`; spSay.textContent = 'King to Ace. Shipped!';
      if (Q && Q.win) Q.win('spider', 'You win!', `Spider Solitaire, one suit, ${moves} moves. Shuffleware shipped the real one.`);
    }
  }
  function targetsFor(from, i) {
    const run = cols[from].slice(i), out = [];
    cols.forEach((col, d) => { if (d !== from && col.length && canDrop(run, d)) out.push(d); });
    if (i > 0) cols.forEach((col, d) => { if (d !== from && !col.length) out.push(d); });
    return out;
  }
  function tapMove(from, i) {
    if (won) return;
    const t = targetsFor(from, i);
    if (!t.length) { spSay.textContent = 'That one’s stuck. Try another card.'; const el = board.querySelector(`.sp-card[data-c="${from}"][data-i="${i}"]`); if (el) { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); } return; }
    doMove(from, i, t[0]);
  }
  board.addEventListener('click', (e) => {
    const b = e.target.closest('.sp-card'); if (!b || b.disabled) return;
    // keyboard Enter/Space only: pointer taps were already handled on pointerup (touch also sends a click afterwards)
    if (performance.now() - lastPointer > 600) tapMove(+b.dataset.c, +b.dataset.i);
  });
  board.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.sp-card'); if (!b || b.disabled || won || e.button > 0) return;
    const from = +b.dataset.c, i = +b.dataset.i;
    const els = $$(`.sp-card[data-c="${from}"]`, board).filter((x) => +x.dataset.i >= i);
    dragging = { from, i, els, x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
    try { b.setPointerCapture(e.pointerId); } catch { /* fine */ }
    e.preventDefault();
  });
  board.addEventListener('pointermove', (e) => {
    if (!dragging || dragging.id !== e.pointerId) return;
    const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y;
    if (!dragging.moved && Math.hypot(dx, dy) > 6) { dragging.moved = true; dragging.els.forEach((x) => x.classList.add('dragging')); }
    if (dragging.moved) dragging.els.forEach((x) => { x.style.translate = `${dx}px ${dy}px`; });
  });
  const endDrag = (e) => {
    if (!dragging || dragging.id !== e.pointerId) return;
    const d = dragging; dragging = null; lastPointer = performance.now();
    d.els.forEach((x) => { x.classList.remove('dragging'); x.style.translate = ''; });
    if (!d.moved) { tapMove(d.from, d.i); return; }
    const colEls = $$('.sp-col', board);
    const dest = colEls.findIndex((ce) => { const r = ce.getBoundingClientRect(); return e.clientX >= r.left - 6 && e.clientX <= r.right + 6; });
    if (dest >= 0 && dest !== d.from && canDrop(cols[d.from].slice(d.i), dest) && (cols[dest].length || d.i > 0)) doMove(d.from, d.i, dest);
    else spSay.textContent = 'Not there. One rank higher, or an empty column.';
  };
  board.addEventListener('pointerup', endDrag);
  board.addEventListener('pointercancel', (e) => { if (dragging && dragging.id === e.pointerId) { dragging.els.forEach((x) => { x.classList.remove('dragging'); x.style.translate = ''; }); dragging = null; } });
  // deal: from = {x, y} on screen (the face-down pile in panel 1). Cards fly out one by one and flip face-up as they land.
  function spDeal(from) {
    cols = DEAL.map((c2) => c2.slice()); moves = 0; won = false; if (spSay !== spStatus) spSay.textContent = 'Build King down to Ace.'; board.classList.remove('dealing'); spRender();
    if (reduced) return;
    if (!from) { void board.offsetWidth; board.classList.add('dealing'); setTimeout(() => board.classList.remove('dealing'), 1400); return; }
    const cards = $$('.sp-card', board).sort((p, q) => (+p.dataset.i - +q.dataset.i) || (+p.dataset.c - +q.dataset.c));
    cards.forEach((el, k) => {
      const r = el.getBoundingClientRect(), dx = from.x - (r.left + r.width / 2), dy = from.y - (r.top + r.height / 2);
      const bk = document.createElement('span'); bk.className = 'sp-back'; el.appendChild(bk);
      const o = { duration: 640, delay: k * 75, easing: 'cubic-bezier(.25,.8,.25,1)', fill: 'backwards' };
      el.animate([{ transform: `translate(${dx}px, ${dy}px) scale(.62)`, offset: 0 }, { transform: 'none', offset: 0.68 }, { transform: 'scaleX(0)', offset: 0.84 }, { transform: 'none' }], o);
      bk.animate([{ opacity: 1 }, { opacity: 1, offset: 0.84 }, { opacity: 0 }], Object.assign({}, o, { fill: 'both' })).onfinish = () => bk.remove();
    });
  }
  // the reverse, when the panel closes: every card flips face-down and flies back to the pile
  window.HA_spiderGather = (to) => {
    if (reduced || !to) return;
    $$('.sp-card', board).sort((p, q) => (+q.dataset.i - +p.dataset.i) || (+q.dataset.c - +p.dataset.c)).forEach((el, k) => {
      const r = el.getBoundingClientRect(), dx = to.x - (r.left + r.width / 2), dy = to.y - (r.top + r.height / 2);
      const bk = document.createElement('span'); bk.className = 'sp-back'; el.appendChild(bk);
      const o = { duration: 420, delay: k * 18, easing: 'cubic-bezier(.5,0,.7,.4)', fill: 'forwards' };
      el.animate([{ transform: 'none' }, { transform: 'scaleX(0)', offset: 0.2 }, { transform: 'none', offset: 0.35 }, { transform: `translate(${dx}px, ${dy}px) scale(.62)` }], o);
      bk.animate([{ opacity: 0 }, { opacity: 0, offset: 0.2 }, { opacity: 1, offset: 0.21 }, { opacity: 1 }], o);
    });
  };
  $('#spReset').addEventListener('click', spDeal);
  $('#spHint').addEventListener('click', () => {
    for (let ci = 0; ci < cols.length; ci++) for (let i = 0; i < cols[ci].length; i++) {
      if (!runOk(cols[ci], i)) continue;
      const t = targetsFor(ci, i).filter((d) => cols[d].length);
      if (t.length) {
        const el = board.querySelector(`.sp-card[data-c="${ci}"][data-i="${i}"]`);
        if (el) { el.classList.remove('hint'); void el.offsetWidth; el.classList.add('hint'); }
        spSay.textContent = `That ${RANK[cols[ci][i]] || cols[ci][i]} goes on the ${RANK[cols[t[0]][cols[t[0]].length - 1]] || cols[t[0]][cols[t[0]].length - 1]}.`;
        return;
      }
    }
  });
  window.HA_spiderDeal = spDeal;
  window.HA_openSpider = () => { if (window.HA_openPanel) window.HA_openPanel(1); else if (spDlg) { spDlg.showModal(); spDeal(); } };

  /* =================================================================
     4. E-ink mode: grayscale e-paper, no motion, page-turn pagination
     ================================================================= */
  const root = document.documentElement, KEY = 'hireAdam.eink';
  const tog = $('#einkBtn');
  const bar = document.createElement('div');
  bar.className = 'eink-bar'; bar.hidden = true;
  bar.innerHTML = '<span id="einkPage">E-ink</span><button type="button" class="eink-pg" id="einkPrev" aria-label="Previous page">‹</button><button type="button" class="eink-pg" id="einkNext" aria-label="Next page">›</button><button type="button" class="eink-exit" id="einkExit">Exit e-ink</button>';
  document.body.appendChild(bar);
  const flash = document.createElement('div'); flash.className = 'eink-flash'; flash.setAttribute('aria-hidden', 'true'); document.body.appendChild(flash);
  const pageH = () => Math.max(200, innerHeight - (innerWidth < 760 ? 64 : 0) - 48);
  function updatePage() {
    const total = Math.max(1, Math.ceil((document.documentElement.scrollHeight - innerHeight) / pageH()) + 1);
    const cur = Math.min(total, Math.round(scrollY / pageH()) + 1);
    $('#einkPage').textContent = `E-ink · page ${cur}/${total}`;
  }
  function turn(dir) {
    const y = Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, scrollY + dir * pageH()));
    if (y === scrollY) return;
    if (!reduced && !matchMedia('(prefers-reduced-motion: reduce)').matches) { flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); }
    setTimeout(() => { scrollTo({ top: y, behavior: 'instant' }); updatePage(); }, reduced ? 0 : 90);
  }
  function setEink(on) {
    root.classList.toggle('eink', on);
    if (tog) { tog.setAttribute('aria-pressed', String(on)); tog.textContent = on ? '◑ E-ink on' : '◐ E-ink'; }
    bar.hidden = !on;
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* private mode */ }
    if (on) updatePage();
  }
  const anyDialog = () => !!document.querySelector('dialog[open]');
  addEventListener('keydown', (e) => {
    if (!root.classList.contains('eink') || anyDialog()) return;
    if (e.target.closest && e.target.closest('input, textarea, select, button, a, [contenteditable]') && e.key === ' ') return;
    if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) { e.preventDefault(); turn(1); }
    else if (e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) { e.preventDefault(); turn(-1); }
  });
  let wheelAcc = 0, wheelT = 0, wheelLock = 0;
  addEventListener('wheel', (e) => {
    if (!root.classList.contains('eink') || anyDialog() || e.ctrlKey) return;
    e.preventDefault();
    if (Date.now() < wheelLock) return;
    wheelAcc += e.deltaY; clearTimeout(wheelT); wheelT = setTimeout(() => { wheelAcc = 0; }, 200);
    if (Math.abs(wheelAcc) > 40) { turn(wheelAcc > 0 ? 1 : -1); wheelAcc = 0; wheelLock = Date.now() + 450; }
  }, { passive: false });
  // tap zones: right third = next page, left third = previous (only on empty areas, never on controls)
  document.addEventListener('click', (e) => {
    if (!root.classList.contains('eink') || anyDialog()) return;
    if (e.target.closest('a, button, input, textarea, select, label, summary, .card, .panel, [role="button"], .eink-bar, .dock, dialog, [popover]')) return;
    const x = e.clientX / innerWidth;
    if (x > 0.66) turn(1); else if (x < 0.34) turn(-1);
  });
  addEventListener('scroll', () => { if (root.classList.contains('eink')) updatePage(); }, { passive: true });
  $('#einkPrev').addEventListener('click', () => turn(-1));
  $('#einkNext').addEventListener('click', () => turn(1));
  $('#einkExit').addEventListener('click', () => { setEink(false); toast('E-ink off'); if (tog) tog.focus(); });
  if (tog) tog.addEventListener('click', () => { const on = !root.classList.contains('eink'); setEink(on); toast(on ? 'E-ink on: PgDn, space or tap the right edge to turn pages' : 'E-ink off'); if (on) $('#einkNext').focus(); });
  setEink(root.classList.contains('eink'));
})();
