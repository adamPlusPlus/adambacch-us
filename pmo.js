/* adambacch.us/beta: the PMO documents, pinned on the §01 Career Gantt (app.js) and opened in a dialog.
   Each is drawn from a Shuffleware, Avabyte or Browsea project and links to where it comes from.
   A #pmo-<id> link opens that document; a #rec-<id> link opens that Gantt bar. */
(() => {
  'use strict';
  // the Browsea chart of works; deep links pick the island and the entry (by title)
  const BROWSEA = 'https://browsea.surf/beta/work/';
  const MEDIA = 'https://browsea.surf/media/';
  const work = (island, entry) => BROWSEA + '?island=' + island + '&entry=' + encodeURIComponent(entry);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const C = { scope: '#0f9fae', schedule: '#4f7dff', cost: '#d99a1e', risk: '#e5484d', quality: '#22b26a', stake: '#7b5cff', integ: '#ff7a1a' };

  // each document's first page, laid out the way the original was: a decision memo, a guidelines document,
  // the deck's opening slides and a spreadsheet register
  const tbl = (head, list, cls) => '<table class="' + (cls || '') + '"><thead><tr>' + head.map((h) => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' +
    list.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
  const DOCS = [
    { id: 'funding', s: 'Funding decision', y: 2018.25, bar: 'shuffle', org: 'Shuffleware', k: 'cost', area: 'Procurement · Decision', t: 'Funding options and acquisition decision', proj: 'Shuffleware',
      from: ['https://adambacch.us/shuffleware-exit/', 'the Shuffleware delivery record'],
      d: 'How a studio of up to five chose between publisher deals, investor funding and an acquisition, with final say on budget and resource allocation.',
      page: '<article class="fx fx-memo"><header class="fx-lh"><b>SHUFFLEWARE</b><span>Mobile card games</span></header>' +
        '<h3 class="fx-mt">Decision Memo</h3><dl class="fx-to"><dt>To</dt><dd>Shuffleware partners</dd><dt>From</dt><dd>Adam Bacchus, Producer and Project Lead</dd><dt>Date</dt><dd>April 2018</dd><dt>Re</dt><dd>Funding path and the proposed acquisition by Avabyte</dd></dl>' +
        '<h4>1. Purpose</h4><p>Record the funding options the studio weighed and recommend the move into Avabyte.</p>' +
        '<h4>2. Background</h4><p>Shuffleware has shipped four iOS card games: <i>Gates</i>, <i>Deal!</i>, <i>Spider Solitaire</i> and <i>Pyramid</i>, with a team of up to five. Prototypes pitched on the E3 circuit drew serious publisher interest, including from Ubisoft.</p>' +
        '<h4>3. Options considered</h4>' + tbl(['Option', 'What it offered', 'Decision'], [
          ['Publisher deal', 'Publishing for the pitched prototypes', 'Declined where the terms did not fit the studio'],
          ['Investor funding', 'Capital to keep the studio independent', 'Taken over the publisher paths that did not fit'],
          ['Acquisition by Avabyte', 'The studio and its four-game portfolio move into Avabyte', '<b>Recommended</b>']]) +
        '<h4>4. Recommendation</h4><p>Accept the acquisition: the studio, its team and its four shipped games move into Avabyte, closing May 2018. Budget and resource allocation through the close stay with the producer.</p>' +
        '<footer class="fx-pf"><span>Shuffleware · Confidential</span><span>Page 1</span></footer></article>' },
    { id: 'offshore', s: 'Delivery guidelines', y: 2019.4, bar: 'avabyte', org: 'Avabyte', k: 'schedule', area: 'Resources · Guidelines', t: 'Offshore delivery guidelines and acceptance', proj: 'Avabyte',
      from: ['https://adambacch.us/avabyte-offshore/', 'the Avabyte delivery record'],
      d: 'Written delivery guidelines for seven concurrent apps built by a mostly offshore team of 5 to 20 developers, through release and formal acceptance.',
      page: '<article class="fx fx-word"><header class="fx-rh"><b>AVABYTE</b><span>Offshore Delivery Guidelines</span></header>' +
        '<h3 class="fx-dt">Offshore Delivery Guidelines</h3><p class="fx-sub">How every Avabyte app is built, reviewed, tracked and accepted</p>' +
        tbl(['Document owner', 'Applies to', 'Status'], [['Adam Bacchus, Technical Program Manager, Offshore Delivery', 'Every developer on Avabyte app projects: seven concurrent apps, 5 to 20 developers', 'In use, 2019']], 'fx-ctl') +
        '<h4>1. Purpose</h4><p>One written standard for a mostly offshore team, so every app is delivered the same way from the first task to formal acceptance.</p>' +
        '<h4>2. Working hours</h4><p>Working hours are shifted so that every developer overlaps the home team for part of each day. Questions, reviews and hand-offs happen in the overlap.</p>' +
        '<h4>3. Code review</h4><p>Every change is reviewed before it is merged. No change ships without a reviewer.</p>' +
        '<h4>4. Tracking and assignments</h4><p>Work is tracked in the internal staffing and multi-project tracker, alongside Trello boards and Slack. Delivery time and bug resolution are recorded for each developer, and new work is assigned to match each developer’s strengths.</p>' +
        '<h4>5. Shared features</h4><p>Similar products are broken into shared, reusable features, so each new app reuses what the last one built …</p>' +
        '<footer class="fx-pf"><span>Avabyte · Internal</span><span>1</span></footer></article>' },
    { id: 'licensing', s: 'Licensing proposal', y: 2022.5, k: 'stake', area: 'Stakeholders · Presentation', t: 'Licensing proposal and presentation', proj: 'Novel-series adaptation', island: 'ai',
      clip: 'novel-adaptation-presentation-v2', clipV: 'tnuxk9',
      d: 'A licensing proposal for a published science-fiction series, from source chapters to a playable slice, presented to the author.',
      page: '<div class="fx fx-deck"><section class="fx-slide fx-s1"><p class="fx-k">Licensing proposal</p><h3>From the page to a playable adventure</h3><p class="fx-s1b">An adventure-game adaptation of the series, with a playable slice</p><p class="fx-s1f"><b>Browsea</b><span>Prepared for the author · 2022</span></p><i class="fx-n">1</i></section>' +
        '<section class="fx-slide fx-s2"><p class="fx-k">What this proposal covers</p><ol><li>The source chapters, broken into beats and a scene list</li><li>The asset pipeline that turns pages into scenes</li><li>A playable adventure-game slice</li><li>The licensing proposal</li><li>The presentation to the author</li></ol><i class="fx-n">2</i></section></div>' },
    { id: 'risk', s: 'Risk responses', y: 2025.25, k: 'risk', area: 'Risk · Register', t: 'Privacy and accuracy risk responses', proj: 'Formwise', island: 'docs',
      d: 'The risks of filling legal and government forms with AI help, each with the response built into the product.',
      page: '<div class="fx fx-sheet"><div class="fx-bar"><b>Formwise_Risk_Register.xlsx</b><span>fx</span><em>Risk register: Formwise</em></div><div class="fx-grid"><table><thead><tr><th></th><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th><th>F</th></tr></thead><tbody>' +
        '<tr><th>1</th><td class="fx-ttl" colspan="6">Formwise · Risk register · Owner: Adam Bacchus, PMP</td></tr>' +
        '<tr class="fx-hd"><th>2</th><td>ID</td><td>Risk</td><td>Category</td><td>Strategy</td><td>Response</td><td>Status</td></tr>' +
        [['R-01', 'Personal data reaches a language model', 'Privacy', 'Avoid', 'Personal data is tokenised before any model sees it; OCR and computer vision run first', 'Built'],
          ['R-02', 'An answer is guessed wrong', 'Accuracy', 'Mitigate', 'The AI step asks instead of guessing; anything no stored fact settles is left for the person', 'Built'],
          ['R-03', 'An outdated form edition is filed', 'Compliance', 'Mitigate', 'A newer-edition warning when the agency has replaced the form', 'Built'],
          ['R-04', 'Forms in one packet disagree', 'Accuracy', 'Mitigate', 'Packet checks compare names, dates, household and address history, naming both forms and lines', 'Built'],
          ['R-05', 'A committing clause goes unnoticed', 'Legal', 'Mitigate', 'The fine print lists each committing clause in plain words', 'Built'],
          ['R-06', 'Lost or altered answers', 'Data', 'Mitigate', 'An encrypted profile vault with an edit history', 'Built']]
          .map((r, i) => '<tr><th>' + (i + 3) + '</th>' + r.map((c, j) => '<td' + (j === 3 ? ' class="fx-st fx-' + c.toLowerCase() + '"' : j === 5 ? ' class="fx-ok"' : '') + '>' + c + '</td>').join('') + '</tr>').join('') +
        '</tbody></table></div><div class="fx-tabs"><b>Risk register</b><span>Change log</span></div></div>' },
  ];

  // y: when the document was written, for its pin on the Browsea lane of the Career Gantt (app.js reads this)
  window.PMO_DOCS = DOCS.map((x) => ({ id: x.id, y: x.y, bar: x.bar || 'browsea', ms: x.ms, s: x.s, t: x.t, d: x.d, area: x.area, proj: x.proj, c: C[x.k] }));

  // a document opens in a dialog: its stamp, its page, the presentation (if any) and where it comes from
  const docDlg = document.getElementById('docDlg'), docBody = document.getElementById('docBody');
  function openDoc(x) {
    if (!docDlg || !docBody) return;
    document.getElementById('docTitle').textContent = x.t;
    docBody.innerHTML = '<div class="fx-wrap">' + x.page + '</div>' +
      '<div class="pdoc-foot">' + (x.clip ? '<button type="button" class="pd-watch">▶ Watch the presentation</button>' : '') +
      (x.from ? '<a class="pd-from" href="' + x.from[0] + '">From <b>' + esc(x.from[1]) + '</b></a>'
        : '<a class="pd-from" href="' + work(x.island, x.proj) + '" target="_blank" rel="noopener">From <b>' + esc(x.proj) + '</b> on browsea.surf <span aria-hidden="true">↗</span></a>') + '</div>';
    const w = docBody.querySelector('.pd-watch');
    if (w) w.addEventListener('click', () => { docDlg.close(); openPres(x); });
    docBody.scrollTop = 0;
    if (!docDlg.open) { if (docDlg.showModal) docDlg.showModal(); else docDlg.setAttribute('open', ''); }
  }
  if (docDlg) {
    // closing drops the #pmo- hash, so the same pin opens it again
    docDlg.addEventListener('close', () => { if (/^#pmo-/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); });
    docDlg.addEventListener('click', (e) => { if (e.target === docDlg) docDlg.close(); });
    document.getElementById('docClose').addEventListener('click', () => docDlg.close());
  }

  // the presentation plays from browsea.surf's media, in a dialog
  const dlg = document.getElementById('presDlg'), vid = document.getElementById('presVid');
  function openPres(x) {
    if (!dlg || !vid) return;
    vid.textContent = '';
    const s = document.createElement('source'); s.src = MEDIA + x.clip + '.mp4?v=' + x.clipV; s.type = 'video/mp4'; vid.appendChild(s);
    vid.poster = MEDIA + x.clip + '.jpg?v=' + x.clipV;
    document.getElementById('presTitle').textContent = x.t;
    document.getElementById('presCap').textContent = x.d;
    vid.load();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    const p = vid.play(); if (p && p.catch) p.catch(() => {});
  }
  if (dlg) {
    dlg.addEventListener('close', () => vid.pause());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    document.getElementById('presClose').addEventListener('click', () => dlg.close());
  }

  // #pmo-<id>: open that document; #rec-<id>: open that Gantt bar (links from browsea.surf land here)
  // Formwise and Stoody records open the Browsea bar
  const REC_BAR = { shuffleware: 'shuffle', avabyte: 'avabyte', meatybee: 'browsea', comics: 'browsea', formwise: 'browsea', stoody: 'browsea' };
  function landOnHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    const rec = /^rec-([a-z]+)$/.exec(id);
    if (rec && REC_BAR[rec[1]]) {
      const bar = document.querySelector('#gRows [data-id="' + REC_BAR[rec[1]] + '"]');
      if (bar) bar.click();
      const g = document.getElementById('milestones');
      if (g) setTimeout(() => g.scrollIntoView({ block: 'start' }), 60);
      return;
    }
    if (!/^pmo-[a-z]+$/.test(id)) return;
    // a document no longer published (browsea.surf may still link to it) lands on the Career Gantt
    const x = DOCS.find((d) => 'pmo-' + d.id === id);
    if (x) { openDoc(x); return; }
    const g = document.getElementById('milestones');
    if (g) setTimeout(() => g.scrollIntoView({ block: 'start' }), 60);
  }
  addEventListener('hashchange', landOnHash);
  landOnHash();
})();
