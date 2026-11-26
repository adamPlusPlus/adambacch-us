/* adambacch.us/card: the business card (tilt, flip), a tile per way to connect (tap → its QR, press and hold → open),
   a full-screen scan view that keeps the screen awake, and instant sharing. QR SVGs come from qrs.js
   (card/scripts/build-card-page.mjs). Analytics: window.bm from ../m.js when present. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var QR = window.CARD_QR || {};
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var bm = function (n, v) { try { if (window.bm) window.bm(n, v); } catch (e) {} };
  var PHONE = "+18328447118", EMAIL = "bacchus.adam@pm.me";
  var VCF = "/adam-bacchus.vcf";

  var ICON = {
    contact: '<svg class="stroke" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="11" r="2.6"/><path d="M5.5 17c.8-2 2-3 3.5-3s2.7 1 3.5 3M14.5 9.5h4M14.5 13h4"/></svg>',
    call: '<svg class="stroke" viewBox="0 0 24 24"><path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    text: '<svg class="stroke" viewBox="0 0 24 24"><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z"/><path d="M8 10h8M8 13h5"/></svg>',
    email: '<svg class="stroke" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
    github: '<svg viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
    website: '<svg viewBox="0 0 64 64"><rect x="12" y="4" width="40" height="56" rx="6" fill="currentColor" opacity=".18"/><rect x="12" y="4" width="40" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="3.5"/><text x="32" y="42" font-family="Arial,sans-serif" font-weight="900" font-size="24" text-anchor="middle" fill="currentColor">AB</text></svg>',
    resume: '<svg class="stroke" viewBox="0 0 24 24"><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h7M9 16.5h7M9 9.5h2.5"/></svg>',
    portfolio: '<svg class="stroke" viewBox="0 0 24 24"><path d="M3 15c3 0 3-2 6-2s3 2 6 2 3-2 6-2M3 19c3 0 3-2 6-2s3 2 6 2 3-2 6-2"/><path d="M12 3v7M9 7l3-4 3 4"/></svg>',
    // for visitors' own cards (make.js)
    instagram: '<svg class="stroke" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".6"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M18.9 2H22l-7.4 8.5L23 22h-6.8l-5.3-6.9L4.8 22H1.7l7.9-9.1L1.5 2h6.9l4.8 6.3zm-1.2 18h1.9L7.4 3.9H5.4z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24"><path d="M14 8.5V6.6c0-.9.6-1.1 1-1.1h2.6V1.6L14 1.5c-4 0-4.9 3-4.9 4.9v2.1H6.8v4h2.3V22.5H14V12.5h3.3l.4-4z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.7 15.1V8.9l5.8 3.1z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24"><path d="M16.6 1.5h-3.7v14.3a3.1 3.1 0 1 1-2.2-3V9a6.9 6.9 0 1 0 5.9 6.8V8.5a8.6 8.6 0 0 0 4.9 1.6V6.4a4.9 4.9 0 0 1-4.9-4.9z"/></svg>',
    link: '<svg class="stroke" viewBox="0 0 24 24"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L11.6 6"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.6-1.6"/></svg>',
    map: '<svg class="stroke" viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    signature: '<svg class="stroke" viewBox="0 0 24 24"><path d="M3 17c2.5 0 3.5-9 6-9s1 8 3.5 8 2-4 3.5-4 1.5 3 5 3"/><path d="M3 21h18"/></svg>',
    globe: '<svg class="stroke" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z"/></svg>',
  };
  // label, what opens on press-and-hold, colours, and the line shown under the code in the scan view
  var LINKS = [
    { id: "contact", label: "Save contact", open: VCF, kind: "download", c: "linear-gradient(135deg,#ffd60a,#ff7a1a)", fg: "#1a1206", big: true, sub: "Scan to add Adam to your contacts" },
    { id: "linkedin", label: "LinkedIn", open: "https://www.linkedin.com/in/adam-bacchus-950a9b210", c: "#0a66c2", sub: "linkedin.com/in/adam-bacchus" },
    { id: "call", label: "Call", open: "tel:" + PHONE, kind: "app", c: "#16a34a", sub: "832-844-7118" },
    { id: "text", label: "Text", open: "sms:" + PHONE, kind: "app", c: "#0ea5e9", sub: "832-844-7118" },
    { id: "email", label: "Email", open: "mailto:" + EMAIL, kind: "app", c: "#ea580c", sub: EMAIL },
    { id: "github", label: "GitHub", open: "https://github.com/adamPlusPlus", c: "#24292f", sub: "github.com/adamPlusPlus" },
    { id: "website", label: "Website", open: "https://adambacch.us/?src=card", c: "linear-gradient(135deg,#7b5cff,#29d3ff)", sub: "adambacch.us" },
    { id: "resume", label: "Résumé", open: "/resume/Adam_Bacchus_Resume.pdf", c: "#4c1d95", sub: "Adam_Bacchus_Resume.pdf" },
    { id: "portfolio", label: "Portfolio", open: "https://browsea.surf/?src=card", c: "#0f766e", sub: "browsea.surf: the studio's work" },
  ];
  var VCF_NAME = "Adam Bacchus.vcf", WHO = "Adam Bacchus";

  // "Make your own" (make.js, loaded on demand). A visitor's own card is this same page with their details in the
  // link, /card/#u=<data>; the part after # never reaches a server.
  var makerLoad = null;
  function loadMaker() {
    if (!makerLoad) makerLoad = new Promise(function (ok, no) {
      if (window.CardMaker) return ok();
      var s = document.createElement("script"); s.src = "make.js?v=20261029k"; s.onload = ok; s.onerror = function () { makerLoad = null; no(); };
      document.head.appendChild(s);
    });
    return makerLoad;
  }
  // a visitor's card is drawn from the same parts; make.js uses these for its live preview, a downloaded copy for itself
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  // the front comes in a few arrangements (card.css .d-*), with a QR code the text makes room for; the back is blank white,
  // a QR on the card colour, a QR beside the photo, or "double": a second face with its own choice of what's on it
  var DESIGNS = ["classic", "split", "centered", "bold", "minimal", "image"];
  // what each side shows unless the maker's checklists say otherwise
  var SHOWN = { n: 1, t: 1, o: 1, photo: 1, p: 1, e: 1, w: 1, linkedin: 0, github: 0, instagram: 0, x: 0, a: 0, qr: 1 };
  var BACK_SHOWN = { n: 1, t: 0, o: 0, photo: 0, p: 1, e: 1, w: 1, linkedin: 1, github: 1, instagram: 1, x: 1, a: 0, qr: 1 };
  // lay: {k: 0 (text big) … 1 (photo big), default .5; z: 0 … 1 zoom of the "image" (photo only) front;
  //       qs: 0 … 1 QR size, default .5; show: {key: bool}; img: the "image" front's picture}; qr: the QR's svg markup
  function frontFace(c, photo, design, lay, qr, defaults) {
    if (DESIGNS.indexOf(design) < 0) design = "classic";
    lay = lay || {};
    var cl = function (v, d) { return v == null || isNaN(v) ? d : Math.max(0, Math.min(1, Number(v))); };
    var k = cl(lay.k, 0.5), z = cl(lay.z, 0), qs = cl(lay.qs, 0.5);
    var on = function (key) { var s = lay.show || {}; return key in s ? !!s[key] : !!(defaults || SHOWN)[key]; };
    var withQr = !!qr && on("qr");
    var vars = "--k:" + k + ";--tx:" + ((1.2 - 0.4 * k) * (withQr ? 1.06 - 0.3 * qs : 1)).toFixed(3) + ";--zm:" + (1 + z * 0.8).toFixed(3) + ";--q:" + (15 + 20 * qs).toFixed(2) + "cqi";
    var code = withQr ? '<span class="pl-qr">' + qr + "</span>" : "";
    var bare = function (u) { return String(u).replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""); };
    if (design === "image") {
      var pic = lay.img || photo;
      return '<span class="plain d-image' + (pic ? " has-photo" : "") + (withQr ? " has-qr" : "") + '" style="' + vars + '">' + (pic ? '<span class="pl-photo" style="background-image:url(&quot;' + esc(pic) + '&quot;)"></span>' :
        '<span class="pl-text"><span class="pl-top"><b>' + esc(c.n || "Your card") + "</b><i>Add a picture for the front</i></span></span>") + code + "</span>";
    }
    if (!on("photo")) photo = "";
    var lines = [], l = c.l || {};
    if (on("p") && c.p && c.p[0]) lines.push(c.p[0]);
    if (on("e") && c.e && c.e[0]) lines.push(c.e[0]);
    if (on("w") && c.w) lines.push(bare(c.w));
    ["linkedin", "github", "instagram", "x"].forEach(function (s) { if (on(s) && l[s]) lines.push(bare(l[s])); });
    if (on("a") && c.a) lines.push(c.a);
    var name = on("n") ? c.n || "Your name" : "", title = on("t") ? c.t : "", org = on("o") ? c.o : "";
    return '<span class="plain d-' + design + (photo ? " has-photo" : "") + (withQr ? " has-qr" : "") + '" style="' + vars + '">' + (photo ? '<span class="pl-photo" style="background-image:url(&quot;' + esc(photo) + '&quot;)"></span>' : "") +
      '<span class="pl-text"><span class="pl-top">' + (name ? "<b>" + esc(name) + "</b>" : "") + (title ? "<i>" + esc(title) + "</i>" : "") + "</span>" +
      (org ? '<span class="pl-org">' + esc(org) + "</span>" : "") + '<span class="pl-lines">' + lines.map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") + "</span>" + code + "</span></span>";
  }
  function backFace(c, qr, back, photo, sub, design, lay) {
    back = back || {};
    var style = back.style === "colour" || back.style === "double" || (back.style === "photo" && photo) ? back.style : "white";
    if (style === "white") return { cls: "face back b-blank", html: "" }; // "white" is the stored name of the blank back
    if (style === "double") return { cls: "face back b-double", html: frontFace(c, photo, design === "image" ? "classic" : design, Object.assign({}, lay || {}, { show: back.show || {} }), qr, BACK_SHOWN) };
    return { cls: "face back qrface b-" + style,
      html: (style === "photo" ? '<span class="qf-photo" style="background-image:url(&quot;' + esc(photo) + '&quot;)"></span>' : "") +
        '<span class="qf-code">' + qr + '</span><span class="qf-text"><b>' + esc(c.n || "") + "</b><span>" + esc(back.line || sub || "Scan to save the contact") + "</span></span>" };
  }
  function rgbOf(h) { h = String(h || "#000").replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); var n = parseInt(h, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function hexOf(rgb) { return "#" + rgb.map(function (v) { return ("0" + Math.round(v).toString(16)).slice(-2); }).join(""); }
  function mix(a, b, k) { var x = rgbOf(a), y = rgbOf(b); return hexOf(x.map(function (v, i) { return v + (y[i] - v) * k; })); }
  function lum(h) { var c = rgbOf(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  var INK = "#17151f", PAPER = "#f7f5ff";
  // A palette is four colours in roles: bg (the page), card (the card face), accent (titles), glow. Text colours follow
  // whichever reads better on each; an accent that would vanish on its background falls back to the glow, then the text.
  function palette(p, el) {
    var root = !el; el = el || document.documentElement;
    var lightBg = contrast(p.bg, INK) > contrast(p.bg, PAPER), toward = lightBg ? "#000000" : "#ffffff";
    var card = p.card || mix(p.bg, toward, 0.07), lightCard = contrast(card, INK) > contrast(card, PAPER);
    var pick = function (on, fallback) { return contrast(p.accent, on) >= 2.3 ? p.accent : contrast(p.glow, on) >= 2.3 ? p.glow : fallback; };
    var set = function (k, v) { el.style.setProperty(k, v); };
    set("--ink", p.bg); set("--ink-2", mix(p.bg, toward, 0.05)); set("--ink-3", mix(p.bg, toward, 0.11));
    set("--text", lightBg ? INK : PAPER); set("--muted", lightBg ? "#5d5870" : "#a7a3c2");
    set("--yellow", pick(p.bg, lightBg ? INK : PAPER)); set("--orange", p.accent); set("--violet", p.glow); set("--cyan", p.glow);
    set("--card", card); set("--card-text", lightCard ? INK : PAPER); set("--card-muted", mix(lightCard ? INK : PAPER, card, 0.3));
    set("--card-accent", pick(card, lightCard ? INK : PAPER)); set("--card-glow", p.glow);
    set("--card-dark", lum(card) <= lum(p.bg) ? card : p.bg); // the blank back: the darker of the card and page colors
    el.classList.toggle("light", lightBg);
    if (root) { var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", p.bg); }
  }
  window.CardFace = { front: frontFace, back: backFace, palette: palette, designs: DESIGNS, shown: SHOWN, backShown: BACK_SHOWN };

  // A visitor's card installs as its own home-screen app: its own name, an icon from its photo (or initials) and colours,
  // and a start URL that opens that card. The manifest is made here, so nothing about the card goes to a server.
  function iconOf(t, size, maskable) {
    return new Promise(function (done) {
      var cv = document.createElement("canvas"), x = cv.getContext("2d"), p = t.pal || {}, c = t.contact;
      cv.width = cv.height = size;
      x.fillStyle = p.card || p.bg || "#16142a"; x.fillRect(0, 0, size, size);
      var r = size * (maskable ? 0.3 : 0.38), finish = function () { done(cv.toDataURL("image/png")); };
      x.beginPath(); x.arc(size / 2, size / 2, r + size * 0.025, 0, Math.PI * 2); x.fillStyle = p.accent || "#ffd60a"; x.fill();
      var initials = function () {
        x.beginPath(); x.arc(size / 2, size / 2, r, 0, Math.PI * 2); x.fillStyle = p.bg || "#0b0a14"; x.fill();
        var w = (c.n || "?").trim().split(/\s+/), ini = ((w[0] || "?")[0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
        x.fillStyle = p.accent || "#ffd60a"; x.font = "900 " + Math.round(r * 0.9) + "px system-ui, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
        x.fillText(ini, size / 2, size / 2 + r * 0.05); finish();
      };
      if (!t.photo) return initials();
      var img = new Image();
      img.onload = function () { x.save(); x.beginPath(); x.arc(size / 2, size / 2, r, 0, Math.PI * 2); x.clip(); x.drawImage(img, size / 2 - r, size / 2 - r, r * 2, r * 2); x.restore(); finish(); };
      img.onerror = initials;
      img.src = t.photo;
    });
  }
  function cardApp(t) {
    var c = t.contact, first = (c.n || "Card").split(" ")[0], p = t.pal || {}, base = location.origin + "/card/";
    Promise.all([iconOf(t, 192), iconOf(t, 512), iconOf(t, 512, true), iconOf(t, 180)]).then(function (ic) {
      var m = { name: (c.n || "Contact") + " · Card", short_name: first.slice(0, 12), description: [c.n, c.t, c.o].filter(Boolean).join(" · "),
        id: base + "?card=" + t.home.id, start_url: t.home.start, scope: base, display: "standalone", orientation: "any",
        background_color: p.bg || "#0b0a14", theme_color: p.bg || "#0b0a14",
        icons: [{ src: ic[0], sizes: "192x192", type: "image/png" }, { src: ic[1], sizes: "512x512", type: "image/png" }, { src: ic[2], sizes: "512x512", type: "image/png", purpose: "maskable" }] };
      // a new <link> (not a changed href): Chrome keeps the manifest it was already fetching otherwise
      var old = document.querySelector('link[rel="manifest"]'), link = document.createElement("link");
      link.rel = "manifest"; link.href = URL.createObjectURL(new Blob([JSON.stringify(m)], { type: "application/manifest+json" }));
      if (old) old.remove();
      document.head.appendChild(link);
      var apple = document.querySelector('link[rel="apple-touch-icon"]'); if (apple) apple.href = ic[3];
      var at = document.querySelector('meta[name="apple-mobile-web-app-title"]'); if (at) at.setAttribute("content", first);
      var ib = $("#installBtn"); if (ib) ib.innerHTML = '<span aria-hidden="true">⊕</span> Add ' + esc(first) + "'s card to your home screen";
    });
  }

  var STANDALONE = !!window.CARD_THEIRS;
  addEventListener("hashchange", function () { if (!STANDALONE && (/#(u|c)=/.test(location.hash) || document.documentElement.classList.contains("theirs"))) location.reload(); });
  if (STANDALONE) {
    document.documentElement.classList.add("theirs");
    start(window.CARD_THEIRS);
  } else if (/#(u|c)=/.test(location.hash)) {
    document.documentElement.classList.add("theirs", "loading");
    var adamsApp = document.querySelector('link[rel="manifest"]'); if (adamsApp) adamsApp.remove(); // this card gets its own (cardApp), before Chrome settles on Adam's
    loadMaker().then(function () { return window.CardMaker.theirs(location.hash); }).then(start, function (err) {
      start(null);
      var n = $("#toast"); n.textContent = (err && err.message) || "Couldn't open that card."; n.classList.add("on"); setTimeout(function () { n.classList.remove("on"); }, 6000);
    });
  } else start(null);

  function start(t) {
  document.documentElement.classList.remove("loading");
  if (t) theirs(t); else document.documentElement.classList.remove("theirs");
  var byId = {};
  LINKS.forEach(function (l) { byId[l.id] = l; });

  // someone else's card: their tiles and codes, their colours, their details (and photo) on the front, their contact code on the back
  function theirs(t) {
    var c = t.contact;
    LINKS = t.links; QR = t.qr; VCF = t.links[0].open; VCF_NAME = t.links[0].fname; WHO = c.n || "This contact";
    if (t.pal) palette(t.pal);
    document.title = WHO + " · Card";
    $(".head h1").innerHTML = esc(WHO) + (c.t || c.o ? " <span>" + esc([c.t, c.o].filter(Boolean).join(" · ")) + "</span>" : "");
    var home = $(".home");
    home.className = "home"; home.removeAttribute("aria-label");
    if (STANDALONE) { if (c.w) { home.textContent = c.w.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""); home.href = c.w; } else home.hidden = true; }
    else { home.innerHTML = "adambacch<b>.us</b>/card"; home.href = "/card/"; }
    var lay = t.layout || {}, fq = QR[lay.qr] ? lay.qr : "contact";
    $("#cardFront").innerHTML = frontFace(c, t.photo, t.design, lay, QR[fq]);
    var bq = t.back && QR[t.back.qr] ? t.back.qr : "contact", bl = t.links.filter(function (l) { return l.id === bq; })[0];
    var bf = backFace(c, QR[bq], t.back, t.photo, bq === "contact" ? "Scan to save the contact" : "Scan for " + bl.label + ": " + bl.sub, t.design, lay);
    var back = $("#cardBack");
    back.className = bf.cls;
    back.innerHTML = bf.html;
    $("#madeWith").hidden = false;
    if ($("#makeBtn")) $("#makeBtn").textContent = "Make your own card";
    if (!STANDALONE && t.home) cardApp(t);
    bm("card-theirs", STANDALONE ? "copy" : "view");
  }

  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg; t.classList.remove("act"); t.classList.add("on");
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove("on"); }, 1800);
  }
  // the owner's email signature: rich HTML for Gmail / Outlook, plain text for anything else
  function copySig(l, b) {
    var done = function () { toast("Signature copied: paste it into your email settings"); bm("card-sig", "copy"); };
    var fallback = function () {
      var box = b.querySelector(".sigbox"), r = document.createRange(), sel = getSelection();
      r.selectNodeContents(box); sel.removeAllRanges(); sel.addRange(r);
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      sel.removeAllRanges();
      if (ok) done(); else toast("Select the signature and copy it");
    };
    try { navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([l.sig], { type: "text/html" }), "text/plain": new Blob([l.sigText], { type: "text/plain" }) })]).then(done, fallback); }
    catch (e) { fallback(); }
  }
  function openLink(l) {
    bm("card-open", l.id);
    if (l.kind === "download") { var a = document.createElement("a"); a.href = l.open; a.download = l.fname || VCF_NAME; document.body.appendChild(a); a.click(); a.remove(); toast("Saving the contact…"); return; }
    if (l.kind === "app") { location.href = l.open; return; } // tel:/sms:/mailto: hand off to the phone's app; the page stays
    // Links only ever open in a new tab; the card never navigates away. ("noopener" would make window.open return null
    // even when it worked, so the opener is cut by hand.) If the browser blocks the tab, offer a tap that it will allow.
    var w = window.open(l.open, "_blank");
    if (w) { try { w.opener = null; } catch (e) {} return; }
    var t = $("#toast");
    t.innerHTML = ""; var a = document.createElement("a");
    a.href = l.open; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Open " + l.label + " ↗";
    a.addEventListener("click", function () { t.classList.remove("on", "act"); });
    t.appendChild(a); t.classList.add("on", "act");
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove("on", "act"); }, 5000);
  }

  /* ---------- tap vs press-and-hold: a tap acts on release; holding past HOLD ms arms it (a buzz and a glow), and letting go
     opens. Opening on release, not from the timer, matters: phones only allow a new tab from the touch itself. ---------- */
  var HOLD = 480;
  function press(el, onTap, onHold) {
    var start = null, timer = 0, held = false;
    function cancel() { clearTimeout(timer); el.classList.remove("holding", "armed"); start = null; }
    el.addEventListener("pointerdown", function (e) {
      if (e.button > 0) return;
      start = { x: e.clientX, y: e.clientY }; held = false;
      el.classList.add("holding");
      timer = setTimeout(function () {
        held = true; el.classList.remove("holding"); el.classList.add("armed");
        if (navigator.vibrate) navigator.vibrate(12);
      }, HOLD);
    });
    el.addEventListener("pointermove", function (e) { if (start && !held && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 12) cancel(); }); // a scroll or drag
    el.addEventListener("pointerup", function (e) {
      if (!start) return;
      var was = held;
      cancel();
      if (was) onHold(e); else onTap(e);
    });
    el.addEventListener("pointercancel", function (e) { var was = held && start; cancel(); if (was) onHold(e); }); // the browser took the gesture after arming: still open
    el.addEventListener("pointerleave", function (e) { if (start && e.pointerType === "mouse") cancel(); });
    el.addEventListener("contextmenu", function (e) { e.preventDefault(); }); // a long press is ours, not the browser's menu
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (e.shiftKey || e.metaKey || e.ctrlKey) onHold(e); else onTap(e); }
    });
    el.addEventListener("click", function (e) { if (e.detail === 0) return; e.preventDefault(); }); // pointer taps are handled above
  }
  var HOVER = matchMedia("(hover: hover)").matches;

  /* ---------- tiles ---------- */
  var tiles = $("#tiles");
  LINKS.forEach(function (l, i) {
    var b = document.createElement("div");
    var isSig = l.kind === "signature", grows = l.id === "contact" || isSig;
    b.className = "tile" + (l.big ? " big" : "") + (grows ? " grows" : "") + (isSig ? " sig" : "");
    b.tabIndex = 0;
    b.setAttribute("role", "button");
    b.setAttribute("aria-label", isSig ? "Email signature: tap to show it large, press and hold to copy it" : l.label + ": tap to show its QR code, press and hold to open");
    b.style.setProperty("--c", l.c);
    if (l.fg) b.style.setProperty("--fg", l.fg);
    b.style.setProperty("--i", i);
    var zoom = isSig ? '<button type="button" class="sigcopy">Copy</button>' : l.id === "contact" ? "" : '<button type="button" class="zoom" aria-label="Show ' + l.label + ' full screen" title="Full screen">⤢</button>';
    b.innerHTML = '<span class="in"><span class="side logo">' + ICON[l.icon || l.id] + '<span class="lbl">' + l.label + "</span></span>" +
      '<span class="side qr">' + (isSig ? '<span class="code sigbox">' + l.sig + "</span>" : '<span class="code">' + (QR[l.id] || "") + "</span>") + '<span class="row"><span class="lbl">' + l.label + "</span>" + zoom + "</span></span></span>";
    tiles.appendChild(b);
    var z = b.querySelector(".zoom"), sc = b.querySelector(".sigcopy");
    if (sc) {
      sc.addEventListener("pointerup", function (e) { e.stopPropagation(); });
      sc.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
      sc.addEventListener("click", function (e) { e.stopPropagation(); copySig(l, b); });
    }
    if (z) {
      z.addEventListener("pointerup", function (e) { e.stopPropagation(); });
      z.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
      z.addEventListener("click", function (e) { e.stopPropagation(); openScan(i); });
    }
    press(b, function () {
      if (grows) { grow(b, !b.classList.contains("open")); return; }
      var open = b.classList.toggle("open");
      if (open) bm("card-qr", l.id);
    }, function () {
      b.classList.add("opening");
      setTimeout(function () { b.classList.remove("opening"); }, 500);
      if (isSig) copySig(l, b); else openLink(l);
    });
  });

  // Save contact flips and grows over the whole grid, so its code is big enough to scan from across a table; a tap shrinks it back.
  // One placeholder holds the tile's spot while it's lifted out of the grid. A tap mid-animation reverses it from wherever
  // it is: the pending settle is cancelled and the same placeholder kept, so fast taps can't strand the tile or add spots.
  var slot = null, settle = 0;
  function grow(b, on) {
    clearTimeout(settle);
    var box = tiles.getBoundingClientRect(), r = b.getBoundingClientRect();
    var side = Math.min(box.width, box.height);
    if (on) {
      if (!slot) {
        slot = document.createElement("div"); slot.className = "tile-slot" + (b.classList.contains("big") ? " big" : "");
        b.parentNode.insertBefore(slot, b);
        b.classList.add("grown");
        place(b, r.left - box.left, r.top - box.top, r.width, r.height);
        void b.offsetWidth;
      }
      tiles.classList.add("has-grown");
      b.classList.add("open");
      place(b, (box.width - side) / 2, (box.height - side) / 2, side, side);
      bm("card-qr", "contact-big");
      if (!lock && navigator.wakeLock && navigator.wakeLock.request) navigator.wakeLock.request("screen").then(function (x) { lock = x; }).catch(function () {});
    } else {
      tiles.classList.remove("has-grown");
      b.classList.remove("open");
      if (lock) { lock.release().catch(function () {}); lock = null; }
      if (!slot) return;
      var to = slot.getBoundingClientRect();
      place(b, to.left - box.left, to.top - box.top, to.width, to.height);
      settle = setTimeout(function () {
        b.classList.remove("grown"); b.style.left = b.style.top = b.style.width = b.style.height = "";
        if (slot) { slot.remove(); slot = null; }
      }, reduced ? 0 : 640);
    }
  }
  function place(b, x, y, w, h) { b.style.left = x + "px"; b.style.top = y + "px"; b.style.width = w + "px"; b.style.height = h + "px"; }
  addEventListener("resize", function () { var g = $(".tile.grown"); if (g && g.classList.contains("open")) { var box = tiles.getBoundingClientRect(), s = Math.min(box.width, box.height); place(g, (box.width - s) / 2, (box.height - s) / 2, s, s); } });
  document.addEventListener("keydown", function (e) { var g = $(".tile.grown.open"); if (g && e.key === "Escape") grow(g, false); });

  /* ---------- the card: tilt with the pointer or the phone, flip on tap, hold to open what that side's code opens ---------- */
  var card = $("#bcard"), hint = $("#cardHint");
  var cur = { rx: 0, ry: 0, mx: 50, my: 50 }, tgt = { rx: 0, ry: 0, mx: 50, my: 50 };
  var mode = "idle", running = false, base = null, lastOrient = 0;
  function aim(px, py, k) {
    k = k || 1;
    tgt.ry = (px - 0.5) * 26 * k; tgt.rx = -(py - 0.5) * 20 * k;
    tgt.mx = px * 100; tgt.my = py * 100;
  }
  function frame(t) {
    if (mode === "orient" && t - lastOrient > 900) mode = "idle";
    if (mode === "idle" && !reduced) { var a = t / 1000; aim(0.5 + Math.sin(a * 0.7) * 0.22, 0.5 + Math.cos(a * 0.55) * 0.18, 0.8); }
    var k = mode === "idle" ? 0.05 : 0.16, moving = 0;
    for (var key in cur) { var d = tgt[key] - cur[key]; cur[key] += d * k; moving += Math.abs(d); }
    card.style.setProperty("--rx", cur.rx.toFixed(2) + "deg");
    card.style.setProperty("--ry", cur.ry.toFixed(2) + "deg");
    card.style.setProperty("--mx", cur.mx.toFixed(1) + "%");
    card.style.setProperty("--my", cur.my.toFixed(1) + "%");
    if (moving > 0.02 || mode !== "idle" || !reduced) requestAnimationFrame(frame); else running = false;
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }
  kick();
  card.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    var r = card.getBoundingClientRect();
    mode = "pointer"; aim((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); kick();
  });
  card.addEventListener("pointerleave", function () { mode = "idle"; kick(); });
  function onOrient(e) {
    if (e.beta == null || e.gamma == null || mode === "pointer") return;
    if (base == null) base = e.beta;
    var g = Math.max(-30, Math.min(30, e.gamma)) / 30, bt = Math.max(-30, Math.min(30, e.beta - base)) / 30;
    lastOrient = performance.now(); mode = "orient";
    aim(0.5 + g * 0.5, 0.5 + bt * 0.5); kick();
  }
  var orientAsked = false;
  function askOrient() {
    if (orientAsked || typeof DeviceOrientationEvent === "undefined") return;
    orientAsked = true;
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission().then(function (s) { if (s === "granted") addEventListener("deviceorientation", onOrient); }).catch(function () {});
    } else addEventListener("deviceorientation", onOrient);
  }
  if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission !== "function") askOrient();

  // front (the meeting table, its code opens the site) and back (the whiteboard, its code calls Adam); holding the back saves
  // the contact. A visitor's card: their details on the front, their contact code on the back; holding either side saves it.
  var holdFront = t ? byId.contact : byId.website, holdBack = (t && t.back && byId[t.back.qr]) || byId.contact;
  function cardText() {
    var f = card.classList.contains("flipped");
    var l = f ? holdBack : holdFront;
    var what = l === byId.contact ? "save " + (t ? WHO : "Adam") + " to your contacts" : !t ? "visit adambacch.us" : l.kind === "app" ? l.label.toLowerCase() + " " + (WHO.split(" ")[0]) : "open " + WHO.split(" ")[0] + "'s " + l.label;
    hint.textContent = "Press and hold the card to " + what;
    card.setAttribute("aria-label", WHO + " business card, " + (f ? "back" : "front") + ". " + (HOVER ? "Click" : "Tap") + " to flip it over. Press and hold (or Shift+Enter) to " + what + ".");
  }
  press(card, function () {
    askOrient();
    var f = card.classList.toggle("flipped");
    card.setAttribute("aria-pressed", String(f));
    cardText();
    bm("card-flip", f ? "back" : "front");
  }, function () {
    card.classList.add("opening");
    setTimeout(function () { card.classList.remove("opening"); }, 500);
    openLink(card.classList.contains("flipped") ? holdBack : holdFront);
  });
  cardText();
  $(".tiles-hint").textContent = "Press and hold a button to open it";

  /* ---------- full-screen scan view ---------- */
  var scan = $("#scan"), sheet = $("#scanSheet"), at = 0, lock = null, returnTo = null;
  function paintScan(dir) {
    var l = LINKS[at];
    $("#scanKicker").textContent = "Scan with your camera";
    $("#scanTitle").textContent = l.label;
    var q = $("#scanQr");
    q.innerHTML = QR[l.id] || "";
    q.style.setProperty("--dir", (dir || 0) * 30 + "px");
    q.classList.remove("swap"); void q.offsetWidth; if (dir) q.classList.add("swap");
    $("#scanSub").textContent = l.sub;
    var o = $("#scanOpen");
    o.href = l.open;
    o.textContent = l.kind === "download" ? "Save ↓" : l.kind === "app" ? "Open" : "Open ↗";
    if (l.kind === "download") o.setAttribute("download", l.fname || VCF_NAME); else o.removeAttribute("download");
    if (l.kind === "app") o.removeAttribute("target"); else o.setAttribute("target", "_blank");
  }
  function openScan(i) {
    at = i; returnTo = document.activeElement;
    paintScan(0);
    scan.hidden = false; requestAnimationFrame(function () { scan.classList.add("on"); });
    $("#scanClose").focus({ preventScroll: true });
    if (navigator.wakeLock && navigator.wakeLock.request) navigator.wakeLock.request("screen").then(function (l) { lock = l; }).catch(function () {});
    bm("card-scan", LINKS[i].id);
  }
  function closeScan() {
    scan.classList.remove("on");
    setTimeout(function () { scan.hidden = true; }, 250);
    if (lock) { lock.release().catch(function () {}); lock = null; }
    if (returnTo && returnTo.focus) returnTo.focus({ preventScroll: true });
  }
  function step(d) { do { at = (at + d + LINKS.length) % LINKS.length; } while (LINKS[at].kind === "signature"); paintScan(d); }
  $("#scanClose").addEventListener("click", closeScan);
  $("#scanPrev").addEventListener("click", function () { step(-1); });
  $("#scanNext").addEventListener("click", function () { step(1); });
  scan.addEventListener("click", function (e) { if (e.target === scan) closeScan(); });
  document.addEventListener("keydown", function (e) {
    if (scan.hidden) return;
    if (e.key === "Escape") closeScan();
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });
  var sx = null;
  sheet.addEventListener("pointerdown", function (e) { sx = e.clientX; });
  sheet.addEventListener("pointerup", function (e) { if (sx != null && Math.abs(e.clientX - sx) > 50) step(e.clientX < sx ? 1 : -1); sx = null; });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && !lock && navigator.wakeLock && (!scan.hidden || $(".tile.grown.open"))) navigator.wakeLock.request("screen").then(function (l) { lock = l; }).catch(function () {});
  });

  /* ---------- make your own; the owner of a stored card can edit it or get its link, files and signature ---------- */
  function maker(b, go) {
    b.addEventListener("click", function () {
      b.classList.add("busy");
      loadMaker().then(function () { b.classList.remove("busy"); go(); }, function () { b.classList.remove("busy"); toast("Couldn't load. Check the connection."); });
    });
  }
  if ($("#makeBtn")) maker($("#makeBtn"), function () { window.CardMaker.open(); });
  if (t && t.own && t.own.edit && $("#ownerTools")) {
    $("#ownerTools").hidden = false;
    $("#makeBtn").hidden = true;
    maker($("#editBtn"), function () { window.CardMaker.manage(t.own, "form"); });
    maker($("#manageBtn"), function () { window.CardMaker.manage(t.own, "done"); });
    var fresh = "card.fresh." + t.own.id, isNew = false;
    try { isNew = sessionStorage.getItem(fresh) === "1"; sessionStorage.removeItem(fresh); } catch (e) {}
    if (isNew) window.CardMaker.ready(t.own); // just made: its link, edit link and website files
  }
  if (STANDALONE) {
    if (!reduced) { document.documentElement.classList.add("intro"); setTimeout(function () { document.documentElement.classList.remove("intro"); }, 2400); }
    return; // a downloaded copy: no app install, no offline worker
  }

  /* ---------- install: a home-screen app that also works offline (sw.js caches the page as it's used) ---------- */
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
  var installEvt = null, inst = $("#installBtn");
  addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); installEvt = e; inst.hidden = false; });
  addEventListener("appinstalled", function () { inst.hidden = true; bm("card-install", "done"); });
  var standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (!standalone && /iPhone|iPad|iPod/.test(navigator.userAgent)) { inst.hidden = false; inst.dataset.ios = "1"; }
  inst.addEventListener("click", function () {
    bm("card-install", "ask");
    if (installEvt) { installEvt.prompt(); installEvt.userChoice.then(function () { installEvt = null; }); return; }
    if (inst.dataset.ios) toast("Tap Share, then “Add to Home Screen”");
  });

  if (!reduced) {
    document.documentElement.classList.add("intro");
    setTimeout(function () { document.documentElement.classList.remove("intro"); }, 2400);
  }
  }
})();
