/* adambacch.us/card — "Make your own": photos of a business card or a contact screen → a contact form (plus a photo,
   colours and privacy choices) → a card page like Adam's (tiles, QRs, scan view). Reading runs on the visitor's device:
   Tesseract reads the text, jsQR reads any QR codes. The card is encrypted here and stored at browsea.surf/api/card
   (browsea-cards.cjs), which can't read it; its short link carries the key. Also: website files (zip), an email
   signature, and editing through a private edit link.
   Loaded on demand by card.js.  window.CardMaker = { open(), manage(own, step), theirs(hash) → Promise<card data> } */
(function () {
  "use strict";
  var LIBS = {
    tesseract: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",
    jsqr: "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js",
    qrgen: "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js",
    jszip: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
  };
  var loaded = {};
  function lib(name) {
    if (!loaded[name]) loaded[name] = new Promise(function (ok, no) {
      var s = document.createElement("script");
      s.src = LIBS[name]; s.async = true; s.crossOrigin = "anonymous";
      s.onload = ok; s.onerror = function () { no(new Error("Couldn't load " + name + ". Check the connection and try again.")); };
      document.head.appendChild(s);
    });
    return loaded[name];
  }
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var bm = function (n, v) { try { if (window.bm) window.bm(n, v); } catch (e) {} };

  /* ================= the contact model ================= */
  // { n: name, t: title, o: company, p: [phones], e: [emails], w: website, l: {linkedin, github, instagram, x, facebook, youtube, tiktok},
  //   a: address, x: [other links], note: anything read that fits nowhere else (kept, so nothing is lost) }
  var SOCIAL = [ // key, recognises its links, label, profile URL for a bare username
    ["linkedin", /linkedin\.com\/(in|company)\/[^\s/?#]+/i, "LinkedIn", "https://www.linkedin.com/in/"],
    ["github", /github\.com\/[^\s/?#]+/i, "GitHub", "https://github.com/"],
    ["instagram", /instagram\.com\/[^\s/?#]+/i, "Instagram", "https://instagram.com/"],
    ["x", /(?:twitter|x)\.com\/[^\s/?#]+/i, "X", "https://x.com/"],
    ["facebook", /(?:facebook|fb)\.com\/[^\s?#]+/i, "Facebook", "https://facebook.com/"],
    ["youtube", /youtube\.com\/(?:@|c\/|channel\/|user\/)[^\s/?#]+/i, "YouTube", "https://youtube.com/@"],
    ["tiktok", /tiktok\.com\/@[^\s/?#]+/i, "TikTok", "https://tiktok.com/@"],
  ];
  var SOCIAL_BY = {};
  SOCIAL.forEach(function (s) { SOCIAL_BY[s[0]] = s; });
  function blank() { return { n: "", t: "", o: "", p: [], e: [], w: "", l: {}, a: "", x: [], note: "" }; }
  function addUnique(list, v, key) {
    v = String(v || "").trim();
    if (!v) return;
    var k = key ? key(v) : v.toLowerCase();
    if (!list.some(function (x) { return (key ? key(x) : x.toLowerCase()) === k; })) list.push(v);
  }
  var digits = function (s) { return String(s).replace(/\D/g, "").slice(-10); }; // the same number with or without +1
  function cleanUrl(u) {
    u = String(u || "").trim().replace(/[),.;]+$/, "");
    if (!u) return "";
    if (!/^https?:\/\//i.test(u)) u = "https://" + u.replace(/^\/+/, "");
    return u;
  }
  // a profile field takes a link or just the username ("rileychen", "@riley", "in/riley")
  function social(k, v) {
    v = String(v || "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v) || /\.[a-z]{2,}\//i.test(v) || /^(www\.)?[a-z0-9-]+\.[a-z]{2,}$/i.test(v)) return cleanUrl(v);
    var h = v.replace(/^@+/, "").replace(/^(in|company)\//i, "").replace(/\s+/g, "");
    return h ? SOCIAL_BY[k][3] + encodeURIComponent(h).replace(/%40/g, "@") : "";
  }
  // the username shown back in a profile field
  function handleOf(k, u) {
    if (!u) return "";
    var m = String(u).match(SOCIAL_BY[k][1]);
    if (!m) return u;
    var tail = u.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "").split("/").pop();
    return k === "linkedin" && /\/company\//i.test(u) ? u.replace(/^https?:\/\/(www\.)?/i, "") : tail.replace(/^@/, "");
  }
  function addLink(c, u) {
    u = cleanUrl(u);
    if (!u) return;
    for (var i = 0; i < SOCIAL.length; i++) if (SOCIAL[i][1].test(u)) { if (!c.l[SOCIAL[i][0]]) c.l[SOCIAL[i][0]] = u; return; }
    var same = function (a, b) { return a.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "").toLowerCase() === b.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "").toLowerCase(); };
    if (c.w && same(c.w, u)) return;
    if (!c.w) c.w = u; else if (!c.x.some(function (x) { return same(x, u); })) c.x.push(u);
  }
  function addNote(c, s) { s = String(s || "").trim(); if (s && c.note.split("\n").indexOf(s) < 0) c.note = c.note ? c.note + "\n" + s : s; }

  /* ----- vCards (from a QR, a pasted export or a .vcf file), MECARD, or a plain link/phone/email ----- */
  function qp(s) { // quoted-printable, as older Android exports write non-ASCII
    try { return decodeURIComponent(s.replace(/=\r?\n/g, "").replace(/%/g, "%25").replace(/=([0-9A-F]{2})/gi, "%$1")); } catch (e) { return s; }
  }
  function fromQr(text, c) {
    text = String(text || "");
    if (/BEGIN:VCARD/i.test(text)) {
      var one = text.split(/END:VCARD/i)[0]; // a file with several contacts: the first one
      var lines = one.replace(/\r?\n[ \t]/g, "").split(/\r?\n/).reduce(function (out, ln) { // join quoted-printable soft breaks
        if (out.length && /=$/.test(out[out.length - 1]) && /QUOTED-PRINTABLE/i.test(out[out.length - 1])) out[out.length - 1] = out[out.length - 1].slice(0, -1) + ln; else out.push(ln);
        return out;
      }, []);
      lines.forEach(function (ln) {
        var m = ln.match(/^([^:;]+)([^:]*):(.*)$/);
        if (!m) return;
        var k = m[1].toUpperCase().replace(/^ITEM\d+\./, ""), params = m[2].toUpperCase(), raw = m[3];
        if (/QUOTED-PRINTABLE/.test(params)) raw = qp(raw);
        var v = raw.replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").trim();
        if (k === "FN" && !c.n) c.n = v;
        if (k === "N" && !c.n) { var p = raw.split(";"); c.n = [p[3], p[1], p[2], p[0], p[4]].filter(Boolean).join(" ").replace(/\\,/g, ",").trim(); }
        if (k === "TITLE" && !c.t) c.t = v;
        if (k === "ROLE" && !c.t) c.t = v;
        if (k === "ORG" && !c.o) c.o = raw.split(";").filter(Boolean).join(", ").replace(/\\,/g, ",");
        if (k === "TEL") addUnique(c.p, v.replace(/^tel:/i, ""), digits);
        if (k === "EMAIL") addUnique(c.e, v.replace(/^mailto:/i, ""));
        if (k === "URL") addLink(c, v);
        if (k === "X-SOCIALPROFILE" || k === "IMPP") {
          var type = (params.match(/TYPE=([A-Z]+)/) || [])[1] || "", key = { TWITTER: "x", X: "x", LINKEDIN: "linkedin", INSTAGRAM: "instagram", GITHUB: "github", FACEBOOK: "facebook", TIKTOK: "tiktok", YOUTUBE: "youtube" }[type];
          if (key && !/^https?:|\./i.test(v)) { if (!c.l[key]) c.l[key] = social(key, v.replace(/^x-apple:/i, "")); } else if (/\./.test(v)) addLink(c, v.replace(/^x-apple:/i, ""));
        }
        if (k === "ADR" && !c.a) c.a = raw.split(";").map(function (x) { return x.replace(/\\n/gi, " ").replace(/\\,/g, ",").trim(); }).filter(Boolean).join(", ");
        if (k === "NOTE") addNote(c, v);
        if (k === "BDAY") addNote(c, "Birthday: " + v);
        if (k === "PHOTO" && !c.photoData) {
          if (/^data:image\//i.test(raw)) c.photoData = raw;
          else if (/ENCODING=B|ENCODING=BASE64|BASE64/.test(params)) c.photoData = "data:image/" + (/PNG/.test(params) ? "png" : /GIF/.test(params) ? "gif" : "jpeg") + ";base64," + raw.replace(/\s+/g, "");
        }
      });
      return true;
    }
    if (/^MECARD:/i.test(text)) {
      text.slice(7).split(/;(?=[A-Z]+:)/).forEach(function (part) {
        var i = part.indexOf(":"); if (i < 0) return;
        var k = part.slice(0, i).toUpperCase(), v = part.slice(i + 1).replace(/;+$/, "");
        if (k === "N" && !c.n) c.n = v.split(",").reverse().join(" ").trim();
        if (k === "TEL") addUnique(c.p, v, digits);
        if (k === "EMAIL") addUnique(c.e, v);
        if (k === "URL") addLink(c, v);
        if (k === "ORG" && !c.o) c.o = v;
        if (k === "ADR" && !c.a) c.a = v;
        if (k === "NOTE") addNote(c, v);
      });
      return true;
    }
    if (/^tel:/i.test(text)) { addUnique(c.p, text.slice(4), digits); return true; }
    if (/^mailto:/i.test(text)) { addUnique(c.e, text.slice(7).split("?")[0]); return true; }
    if (/^(https?:\/\/|www\.)/i.test(text)) { addLink(c, text); return true; }
    return false;
  }

  /* ----- from text (a photo's OCR, or text pasted from a contacts app): lines with their heights (bigger type = more likely the name) ----- */
  var TITLE_WORDS = /\b(manager|director|engineer|developer|designer|founder|co-?founder|ceo|cto|cfo|coo|cmo|president|vice president|vp|head of|lead|consultant|analyst|architect|officer|owner|partner|associate|specialist|coordinator|administrator|producer|artist|writer|editor|attorney|lawyer|realtor|agent|broker|advisor|adviser|recruiter|scientist|professor|teacher|nurse|doctor|dr\.|md|pmp|cpa|rn|phd|intern|student|chef|photographer|marketing|sales|account executive|strategist|technician|planner)\b/i;
  var COMPANY_WORDS = /\b(inc|llc|l\.l\.c|ltd|corp|corporation|co\.|company|group|studio|studios|labs|lab|technologies|technology|solutions|partners|associates|agency|consulting|university|college|bank|realty|holdings|ventures|systems|media|design|services)\b/i;
  var ADDRESS = /(\d{1,6}\s+[\w .'-]+\s(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|ct|court|pkwy|parkway|hwy|highway|pl|place|suite|ste)\b)|(\b[A-Z]{2}\s+\d{5}(-\d{4})?\b)/i;
  var EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  // any two-letter country ending, plus the common longer ones (so "babeli.xyz", "jane.studio", "acme.co.uk" are links)
  var TLDS = "com|net|org|edu|gov|mil|int|info|biz|xyz|app|dev|io|ai|site|online|store|shop|tech|design|studio|art|blog|page|link|live|life|world|today|space|website|club|pro|email|cloud|digital|media|agency|solutions|services|consulting|global|group|company|works|team|zone|network|systems|software|codes|photography|photo|gallery|music|film|video|news|press|health|care|law|legal|finance|capital|fund|money|city|nyc|london|land|house|homes|realty|estate|travel|fitness|yoga|coach|academy|school|education|institute|foundation|social|one|surf|fun|cool|rocks|ninja|guru|expert|love|game|games|me|tv|fm|ly|gg|sh|so|to|vc|ws|[a-z]{2}";
  var URL_RE = new RegExp("\\b((?:https?:\\/\\/)?(?:www\\.)?[a-z0-9][a-z0-9-]*(?:\\.[a-z0-9-]+)*\\.(?:" + TLDS + ")(?![a-z0-9-])(?:\\/[^\\s,;|]*)?)", "gi");
  var PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s.-]?\d{3}[\s.-]?\d{3,4}\b/g;
  // "Name: Jane Doe", "Mobile: …", "LinkedIn: jane" and the like, as contact apps export text
  var LABELS = [
    [/^(?:full\s*)?name$/i, "n"], [/^(?:(?:job\s*)?title|position|role)$/i, "t"], [/^(?:company|organi[sz]ation|org|employer)$/i, "o"],
    [/^(?:(?:street|work|home)\s*)?address$/i, "a"], [/^(?:web\s*site|web|url|home\s*page)$/i, "w"], [/^notes?$/i, "note"],
    [/^linked\s*in$/i, "linkedin"], [/^git\s*hub$/i, "github"], [/^(?:insta(?:gram)?|ig)$/i, "instagram"], [/^(?:twitter|x)$/i, "x"], [/^(?:facebook|fb)$/i, "facebook"], [/^tik\s*tok$/i, "tiktok"], [/^you\s*tube$/i, "youtube"],
  ];

  function fromText(lines, c) {
    var used = new Array(lines.length).fill(false);
    lines.forEach(function (ln, i) {
      var t = ln.text.replace(/\s*\(at\)\s*|\s+@\s+/gi, "@").replace(/\s*\(dot\)\s*/gi, ".");
      var hit = false, m;
      if ((m = t.match(/^\s*([A-Za-z][A-Za-z ]{0,20}?)\s*[:：]\s*(.+)$/))) {
        var lab = LABELS.filter(function (L) { return L[0].test(m[1].trim()); })[0], val = m[2].trim();
        if (lab) {
          var k = lab[1];
          if (k === "n" && !c.n) c.n = val; else if (k === "t" && !c.t) c.t = val; else if (k === "o" && !c.o) c.o = val; else if (k === "a" && !c.a) c.a = val;
          else if (k === "w") addLink(c, val); else if (k === "note") addNote(c, val);
          else if (SOCIAL_BY[k]) { if (!c.l[k]) c.l[k] = social(k, val); }
          used[i] = true;
          return;
        }
      }
      (t.match(EMAIL_RE) || []).forEach(function (e) { addUnique(c.e, e); hit = true; });
      var noMail = t.replace(EMAIL_RE, " ");
      (noMail.match(URL_RE) || []).forEach(function (u) { if (!/@/.test(u) && !/^\d+(\.\d+)+$/.test(u)) { addLink(c, u); hit = true; } });
      var noUrl = noMail.replace(URL_RE, " ");
      if (!/\bfax\b/i.test(noUrl)) (noUrl.match(PHONE_RE) || []).forEach(function (p) { var d = String(p).replace(/\D/g, ""); if (d.length >= 10 && d.length <= 15) { addUnique(c.p, p.trim(), digits); hit = true; } });
      if ((m = t.match(/(?:^|\s)@([a-z0-9_.]{2,30})\b/i))) {
        var net = /insta|\big\b/i.test(t) ? "instagram" : /twitter|\bx\b/i.test(t) ? "x" : /tik\s*tok/i.test(t) ? "tiktok" : "";
        if (net && !c.l[net]) { c.l[net] = social(net, m[1]); hit = true; }
      }
      if (!hit && ADDRESS.test(t)) { if (!c.a) c.a = t.trim(); else if (c.a.indexOf(t.trim()) < 0) c.a += ", " + t.trim(); hit = true; }
      used[i] = hit;
    });
    var rest = lines.map(function (ln, i) { return { text: ln.text.trim(), h: ln.h || 0, i: i }; }).filter(function (x) { return !used[x.i] && x.text.length > 1 && /[a-z]/i.test(x.text); });
    var wordsOk = function (s) { var w = s.split(/\s+/); return w.length >= 2 && w.length <= 4 && w.every(function (x) { return /^[A-Za-zÀ-ÿ'.-]+$/.test(x); }); };
    if (!c.t) { var tl = rest.find(function (x) { return TITLE_WORDS.test(x.text) && x.text.length < 60; }); if (tl) { c.t = tl.text; tl.taken = true; } }
    if (!c.o) { var co = rest.find(function (x) { return !x.taken && COMPANY_WORDS.test(x.text) && x.text.length < 60; }); if (co) { c.o = co.text; co.taken = true; } }
    if (!c.n) {
      var cand = rest.filter(function (x) { return !x.taken && wordsOk(x.text) && !TITLE_WORDS.test(x.text) && !COMPANY_WORDS.test(x.text); })
        .sort(function (a, b) { return b.h - a.h || a.i - b.i; });
      if (cand[0]) { c.n = titleCase(cand[0].text); cand[0].taken = true; }
    }
    // whatever is left (a tagline, a second address line, a handle) goes in the note rather than being dropped
    rest.forEach(function (x) { if (!x.taken && x.text !== c.n && x.text !== c.t && x.text !== c.o && /[a-z]{2}/i.test(x.text) && x.text.replace(/[^a-z]/gi, "").length >= 3) addNote(c, x.text); });
    if (!c.o && c.e.length) {
      var dom = c.e[0].split("@")[1] || "";
      if (!/gmail|yahoo|outlook|hotmail|icloud|proton|pm\.me|aol|live\./i.test(dom)) var d0 = dom.split(".")[0]; c.o = d0.charAt(0).toUpperCase() + d0.slice(1);
    }
    return c;
  }
  function titleCase(s) {
    s = String(s || "").trim();
    return s === s.toUpperCase() ? s.toLowerCase().replace(/\b[a-zà-ÿ]/g, function (m) { return m.toUpperCase(); }) : s;
  }
  // pasted text or a .vcf/.txt file: a vCard, or lines as a contacts app shares them
  function fromPaste(text, c) {
    text = String(text || "").trim();
    if (!text) return false;
    if (/BEGIN:VCARD/i.test(text) || /^MECARD:/i.test(text)) return fromQr(text, c);
    fromText(text.split(/\r?\n/).map(function (t) { return { text: t.trim(), h: 0 }; }).filter(function (l) { return l.text; }), c);
    return true;
  }

  /* ----- reading one photo: shrink, look for QR codes, then OCR ----- */
  function loadImage(file) {
    return new Promise(function (ok, no) {
      var img = new Image();
      img.onload = function () { ok(img); };
      img.onerror = function () { no(new Error("That file isn't a picture this browser can read")); };
      img.src = URL.createObjectURL(file);
    });
  }
  function canvasOf(img, max) {
    var s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    var cv = document.createElement("canvas");
    cv.width = Math.round(img.naturalWidth * s); cv.height = Math.round(img.naturalHeight * s);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    return cv;
  }
  async function findQrs(cv) {
    var out = [];
    if ("BarcodeDetector" in window) {
      try { var d = new window.BarcodeDetector({ formats: ["qr_code"] }); (await d.detect(cv)).forEach(function (r) { out.push(r.rawValue); }); } catch (e) {}
    }
    if (!out.length) {
      await lib("jsqr");
      var ctx = cv.getContext("2d"), id = ctx.getImageData(0, 0, cv.width, cv.height);
      var r = window.jsQR(id.data, cv.width, cv.height, { inversionAttempts: "attemptBoth" });
      if (r && r.data) out.push(r.data);
    }
    return out;
  }
  var worker = null;
  async function ocr(cv, progress) {
    await lib("tesseract");
    if (!worker) worker = await window.Tesseract.createWorker("eng", 1, { logger: function (m) { if (m.status === "recognizing text" && progress) progress(m.progress); } });
    var r = await worker.recognize(cv);
    var lines = (r.data.lines || []).map(function (l) { return { text: l.text.replace(/\s+/g, " ").trim(), h: l.bbox ? l.bbox.y1 - l.bbox.y0 : 0 }; }).filter(function (l) { return l.text; });
    if (!lines.length) lines = String(r.data.text || "").split(/\n/).map(function (t) { return { text: t.trim(), h: 0 }; }).filter(function (l) { return l.text; });
    return lines;
  }

  /* ================= vCard + link encoding ================= */
  function vcard(c, withPhoto) {
    var e = function (s) { return String(s || "").replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n"); };
    var parts = String(c.n || "").trim().split(/\s+/), last = parts.length > 1 ? parts.pop() : "", first = parts.join(" ");
    var L = ["BEGIN:VCARD", "VERSION:3.0", "N:" + e(last) + ";" + e(first) + ";;;", "FN:" + e(c.n || "")];
    if (c.t) L.push("TITLE:" + e(c.t));
    if (c.o) L.push("ORG:" + e(c.o));
    c.p.forEach(function (p) { L.push("TEL;TYPE=CELL:" + p.replace(/[^\d+]/g, "")); });
    c.e.forEach(function (m) { L.push("EMAIL;TYPE=INTERNET:" + m); });
    if (c.w) L.push("URL:" + c.w);
    Object.keys(c.l).forEach(function (k) { L.push("URL:" + c.l[k]); });
    c.x.forEach(function (u) { L.push("URL:" + u); });
    if (c.a) L.push("ADR;TYPE=WORK:;;" + e(c.a) + ";;;;");
    if (c.note) L.push("NOTE:" + e(c.note));
    // the saved .vcf carries the photo; the QR's vCard leaves it out (too big for a code)
    var m = withPhoto && String(withPhoto).match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/);
    if (m) L.push("PHOTO;ENCODING=b;TYPE=" + (m[1] === "png" ? "PNG" : m[1] === "webp" ? "WEBP" : "JPEG") + ":" + m[2]);
    L.push("END:VCARD");
    return L.join("\r\n");
  }
  function b64u(str) { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function unb64u(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return decodeURIComponent(escape(atob(s))); }
  function linkFor(c) {
    var slim = {};
    Object.keys(c).forEach(function (k) { var v = c[k]; if (Array.isArray(v) ? v.length : v && typeof v === "object" ? Object.keys(v).length : v) slim[k] = v; });
    return location.origin + "/card/#u=" + b64u(JSON.stringify(slim));
  }
  function decode(hash) {
    var m = String(hash || "").match(/#u=([A-Za-z0-9_-]+)/);
    if (!m) return null;
    try { var c = Object.assign(blank(), JSON.parse(unb64u(m[1]))); return c.n || c.p.length || c.e.length ? c : null; } catch (e) { return null; }
  }
  async function qrSvg(text) {
    await lib("qrgen");
    var q = window.qrcode(0, "M");
    q.addData(unescape(encodeURIComponent(text)), "Byte"); // UTF-8 bytes
    q.make();
    // the same markup as the prebuilt codes in qrs.js, so the page sizes both alike
    var n = q.getModuleCount(), m = 1, d = "";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += "M" + (c + m) + " " + (r + m) + "h1v1h-1z";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (n + 2 * m) + " " + (n + 2 * m) + '" shape-rendering="crispEdges"><path fill="#ffffff" d="M0 0h' + (n + 2 * m) + "v" + (n + 2 * m) + 'H0z"/><path fill="#0b0a14" d="' + d + '"/></svg>';
  }

  /* ================= stored cards: encrypted here, short links ================= */
  // The card (details, photo, colours) is sealed with AES-GCM before it leaves the device. The key comes from a random
  // secret that lives only in the link after the # (plus the password, when the owner sets one), so the server keeps
  // bytes it can't read. Link: adambacch.us/c/#<id 8><secret 16>; the owner's edit link adds ~<edit token 22>.
  var API = window.CARD_API || (/(^|\.)adambacch\.us$/.test(location.hostname) ? "https://browsea.surf" : "http://127.0.0.1:3460");
  var SHORT = /(^|\.)adambacch\.us$/.test(location.hostname) ? "https://adambacch.us/c/#" : location.origin + "/c/#";
  var enc = new TextEncoder(), dec = new TextDecoder();
  function rand(n) { var a = new Uint8Array(n); crypto.getRandomValues(a); return a; }
  function bytesB64u(u8) { var s = ""; for (var i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function b64uBytes(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function newId() { var A = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789", a = rand(8), s = ""; for (var i = 0; i < 8; i++) s += A[a[i] % A.length]; return s; }
  async function hex256(s) { var h = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s))); return Array.prototype.map.call(h, function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); }
  // the card key: HKDF(secret [+ PBKDF2(password)]) → 256 bits (the same key deriveKey gave earlier cards)
  async function keyBits(id, secret, password, salt) {
    var ikm = secret;
    if (password) {
      var pk = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
      var bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: b64uBytes(salt), iterations: 250000, hash: "SHA-256" }, pk, 256));
      ikm = new Uint8Array(secret.length + 32); ikm.set(secret); ikm.set(bits, secret.length);
    }
    var base = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: enc.encode(id), info: enc.encode("adambacch.us/card v1") }, base, 256));
  }
  async function keyFor(id, secret, password, salt) {
    return crypto.subtle.importKey("raw", await keyBits(id, secret, password, salt), "AES-GCM", false, ["encrypt", "decrypt"]);
  }
  // Moderation: a copy of the card key (and the link's secret) locked to the site owner's admin key. Its private half
  // stays on the owner's PC (Meatybee), so the server still can't read cards; the owner can open, fix or remove one.
  var ADMIN_KEY = { kty: "RSA", e: "AQAB", alg: "RSA-OAEP-256", n: "wxoY4fUnGL3qu99TuqfboJIIOKgaF35cbas1FP1pcLmA7It_Rflo2uSuqiwJaqBKIat5DjXFKrsiMdHVz419aTMmObXI4LcIK35GEyl72BU-LPCunGJJrkemEodUgv_pjR-MKar1gW8st6xtrlYIqijfmpQqrqhU1RoP6L5fmLVz_GS5wNtyNCkouvW0vkbByvDhGqiPfTOfXP7lgd0qsokBQQoZlWOeQ_aZcjkj02pG2V0oD18xwmfut7jxkbF6-LBOsbXHoDl14PrS_ROddk1lcSnHAE3mAfZcTur1VcxEqEjYYde11AYzyugGEMoU2kkCL-Ru3PvpDrUps0v2oN8G7xv5pzHS0SgXsFly2mpFda2ZlrAZAMRWY8bOjmXPJhxtcSwMAxcJK4U99XL28ojKthadXiT7yk6Xmw0x57cBB_fg4QcU_leQId5hHa84WXjVXBjOYJh1pJWPQGXRCbS5VEuNwl3PQxaXvRkeIAqwX0crxkyCVSuQzuaPiQCx" };
  async function escrow(raw, s) {
    var pub = await crypto.subtle.importKey("jwk", ADMIN_KEY, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
    return bytesB64u(new Uint8Array(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pub, enc.encode(JSON.stringify({ v: 1, k: bytesB64u(raw), s: s })))));
  }
  async function sealed(payload, id, secret, s, password, salt) {
    var raw = await keyBits(id, secret, password, salt), key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
    return { blob: await seal(payload, key), pw: !!password, salt: salt, adm: await escrow(raw, s) };
  }
  async function seal(obj, key) {
    var iv = rand(12), ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, enc.encode(JSON.stringify(obj))));
    var out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
    return bytesB64u(out);
  }
  async function unseal(blob, key) {
    var u = b64uBytes(blob);
    return JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: u.slice(0, 12) }, key, u.slice(12))));
  }
  var SAY = { "not-found": "This card doesn't exist any more.", "slow-down": "Too many tries. Wait a little and try again.", "too-big": "That card is too large. Try a smaller photo.",
    locked: "This card was made without editing.", "not-yours": "This edit link doesn't match the card.", offline: "The card service is offline for a moment. Try again shortly.", full: "The card service is full right now." };
  async function api(method, id, body, edit) {
    var h = {};
    if (body) h["Content-Type"] = "application/json";
    if (edit) h["X-Edit-Token"] = edit;
    var r;
    try { r = await fetch(API + "/api/card/" + id, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined, cache: "no-store" }); }
    catch (e) { var x = new Error(SAY.offline); x.code = "offline"; throw x; }
    var j = {};
    try { j = await r.json(); } catch (e) {}
    if (!r.ok) { var err = new Error(SAY[j.error] || (r.status >= 500 ? SAY.offline : "The card service said no (" + r.status + ").")); err.code = j.error || r.status; throw err; }
    return j;
  }
  function parseToken(hash) {
    var m = String(hash || "").match(/#c=([A-Za-z0-9]{8})([A-Za-z0-9_-]{16})(?:~([A-Za-z0-9_-]{22}))?/);
    return m ? { id: m[1], s: m[2], edit: m[3] || "" } : null;
  }
  var linkOf = function (id, s, edit) { return SHORT + id + s + (edit ? "~" + edit : ""); };
  var editKey = function (id) { return "card.edit." + id; };
  function remember(id, edit) { try { if (edit) localStorage.setItem(editKey(id), edit); else localStorage.removeItem(editKey(id)); } catch (e) {} }
  function recall(id) { try { return localStorage.getItem(editKey(id)) || ""; } catch (e) { return ""; } }

  // save a new card, or replace one (same id and secret, so its link and QR never change)
  async function store(payload, opt) {
    var password = opt.password || "", salt = password ? bytesB64u(rand(16)) : "";
    if (opt.was) {
      var w = opt.was;
      await api("PUT", w.id, await sealed(payload, w.id, b64uBytes(w.s), w.s, password, salt), w.edit);
      return { id: w.id, s: w.s, edit: w.edit, link: linkOf(w.id, w.s), editLink: linkOf(w.id, w.s, w.edit) };
    }
    var edit = opt.editable ? bytesB64u(rand(16)) : "", editHash = edit ? await hex256(edit) : "";
    for (var tries = 0; ; tries++) {
      var id = newId(), secret = rand(12), s = bytesB64u(secret), body = await sealed(payload, id, secret, s, password, salt);
      body.edit = editHash;
      try { await api("POST", id, body); }
      catch (e) { if (e.code === "taken" && tries < 3) continue; throw e; }
      remember(id, edit);
      return { id: id, s: s, edit: edit, link: linkOf(id, s), editLink: edit ? linkOf(id, s, edit) : "" };
    }
  }
  // the encrypted copy is kept on this device too, so a card opened once (or installed) still opens without a signal
  async function fetchCard(tok) {
    var got, password = "", keep = "card.blob." + tok.id;
    try {
      got = await api("GET", tok.id);
      try { localStorage.setItem(keep, JSON.stringify({ blob: got.blob, pw: got.pw, salt: got.salt })); } catch (e) {}
    } catch (e) {
      if (e.code === "not-found") { try { localStorage.removeItem(keep); } catch (x) {} throw e; }
      try { got = JSON.parse(localStorage.getItem(keep) || "null"); } catch (x) {}
      if (!got) throw e;
    }
    var key;
    if (got.pw) {
      var just = ""; try { just = sessionStorage.getItem("card.pw." + tok.id) || ""; sessionStorage.removeItem("card.pw." + tok.id); } catch (e) {}
      if (just) { try { return { payload: await unseal(got.blob, await keyFor(tok.id, b64uBytes(tok.s), just, got.salt)), password: just }; } catch (e) {} }
      for (var tries = 0; ; tries++) {
        password = await askPassword(tries ? "That password didn't open it. Try again." : "");
        if (password == null) { var x = new Error("This card is locked with a password."); x.code = "locked-pw"; throw x; }
        key = await keyFor(tok.id, b64uBytes(tok.s), password, got.salt);
        try { return { payload: await unseal(got.blob, key), password: password }; } catch (e) {}
      }
    }
    key = await keyFor(tok.id, b64uBytes(tok.s), "", "");
    try { return { payload: await unseal(got.blob, key), password: "" }; }
    catch (e) { var y = new Error("This link is incomplete. Ask its owner to send it again."); y.code = "bad-key"; throw y; }
  }
  function askPassword(msg) {
    return new Promise(function (done) {
      var d = document.createElement("dialog");
      d.className = "mk mk-pw";
      d.innerHTML = '<form method="dialog" class="mk-in"><p class="mk-k">Locked card</p><h2>Enter its password</h2>' + (msg ? '<p class="mk-p warn">' + esc(msg) + "</p>" : "") +
        '<label class="mk-f"><span>Password</span><input type="password" name="pw" autocomplete="current-password" required></label>' +
        '<div class="mk-row"><button type="button" class="mk-btn" value="cancel">Cancel</button><button class="mk-btn primary" value="ok">Open card</button></div></form>';
      document.body.appendChild(d);
      var f = d.querySelector("form"), result = null;
      d.querySelector('[value="cancel"]').addEventListener("click", function () { d.close(); });
      f.addEventListener("submit", function (e) { e.preventDefault(); result = f.elements.pw.value; d.close(); });
      d.addEventListener("close", function () { d.remove(); done(result); });
      d.showModal();
      f.elements.pw.focus();
    });
  }

  /* ================= colours ================= */
  // Whole palettes of four colours. Rotating one shifts every colour to the next role (page, card face, accent, glow),
  // so each palette gives four different looks.
  var PALETTES = {
    night: ["#0b0a14", "#1b1733", "#ffd60a", "#7b5cff"], ocean: ["#03131f", "#0b2a3c", "#5eead4", "#0ea5e9"],
    forest: ["#0a140d", "#16301f", "#bef264", "#16a34a"], ember: ["#160807", "#2c100c", "#fdba74", "#e11d48"],
    orchid: ["#170a14", "#2d1229", "#f9a8d4", "#a855f7"], nordic: ["#2e3440", "#3b4252", "#88c0d0", "#ebcb8b"],
    retro: ["#264653", "#2a9d8f", "#e9c46a", "#f4a261"], sunset: ["#2d1b3d", "#ff6b6b", "#ffd93d", "#6bcbef"],
    citrus: ["#fffbe6", "#155263", "#ff6f3c", "#ffc93c"], mint: ["#effff8", "#0f766e", "#f97316", "#99f6e4"],
    paper: ["#f5f1e8", "#ffffff", "#b45309", "#4f46e5"], sand: ["#f4ede4", "#3d2c1e", "#c2410c", "#e0cfb8"],
    berry: ["#2b0b3f", "#5c1a6b", "#ff9ff3", "#feca57"], mono: ["#111111", "#1f1f1f", "#f5f5f5", "#737373"],
    blush: ["#fff1f4", "#ffd3dd", "#d6336c", "#b197fc"], peach: ["#fff5ee", "#ffcfb0", "#d9480f", "#7048e8"],
    lavender: ["#f6f2ff", "#ddd2ff", "#5f3dc4", "#f783ac"], sakura: ["#2a1b25", "#ffd6e0", "#ff6b95", "#8fd8c9"],
    cotton: ["#fdf3ff", "#c3e4ff", "#ff7aa2", "#cdb4ff"], strawberry: ["#fff8fa", "#ffc4d4", "#c2255c", "#ffd43b"],
    matcha: ["#f2f5ea", "#b9cf98", "#2f5233", "#f2c94c"], seafoam: ["#effaf6", "#a8e6cf", "#22577a", "#ffc6a8"],
    honey: ["#fff9e8", "#ffd166", "#6b3e00", "#ef8354"], lagoon: ["#e6fbfd", "#3d5a80", "#ffb4a2", "#98c1d9"],
    coral: ["#fff4ef", "#ff8a73", "#1d3557", "#ffd6a5"], lilac: ["#f6f0ea", "#cbb8e8", "#463a6b", "#e8b98f"],
    dusk: ["#1c1836", "#4a1d5c", "#ffa36c", "#e05780"], aurora: ["#06141c", "#0d2b38", "#7af5c8", "#c38bff"],
    moonlight: ["#0e1124", "#1e2448", "#e3e8ff", "#9fb1ff"], bubblegum: ["#ffe6ee", "#ff8fb1", "#4c1d6b", "#9be7ff"],
    carbon: ["#0d0f12", "#1c2128", "#38bdf8", "#64748b"], steel: ["#1b2430", "#2c3a4b", "#f59e0b", "#94a3b8"],
    navy: ["#0a1628", "#13294b", "#e8c547", "#5b8def"], volt: ["#0b0b0b", "#18181b", "#d4ff3a", "#22d3ee"],
    slate: ["#e7e9ec", "#334155", "#ea580c", "#94a3b8"], olive: ["#f1efe6", "#3f4a2a", "#c08a2d", "#8a9a5b"],
    leather: ["#1e1611", "#3a2a1e", "#d4a373", "#7f5539"], denim: ["#eef2f7", "#1f3b5c", "#e76f51", "#6b8cae"],
    copper: ["#151515", "#2a1f1a", "#e07a3f", "#b0b0b0"], tweed: ["#efe9df", "#4a4237", "#2f6f6a", "#b9a88c"],
  };
  // the picker shows them in four groups of ten, each collapsible
  var PAL_GROUPS = [
    ["Cool & bold", ["night", "ocean", "forest", "ember", "mono", "aurora", "carbon", "steel", "navy", "volt"]],
    ["Earthy & classic", ["nordic", "retro", "sand", "paper", "slate", "olive", "leather", "denim", "copper", "tweed"]],
    ["Cute & sweet", ["blush", "cotton", "strawberry", "bubblegum", "peach", "sakura", "honey", "berry", "sunset", "coral"]],
    ["Soft & dreamy", ["lavender", "lilac", "orchid", "dusk", "seafoam", "lagoon", "mint", "moonlight", "matcha", "citrus"]],
  ];
  function palOf(name, rot) {
    var p = PALETTES[name] || PALETTES.night, r = ((rot || 0) % 4 + 4) % 4, at = function (i) { return p[(i + r) % 4]; };
    return { name: PALETTES[name] ? name : "night", rot: r, bg: at(0), card: at(1), accent: at(2), glow: at(3) };
  }

  /* ================= their card, for card.js ================= */
  var COLORS = { contact: "linear-gradient(135deg,#ffd60a,#ff7a1a)", call: "#16a34a", text: "#0ea5e9", email: "#ea580c", website: "linear-gradient(135deg,#7b5cff,#29d3ff)", linkedin: "#0a66c2", github: "#24292f", instagram: "linear-gradient(135deg,#f58529,#dd2a7b,#8134af)", x: "#111", facebook: "#1877f2", youtube: "#e11d1d", tiktok: "#111", map: "#0f766e", link: "#4c1d95" };
  var bare = function (u) { return u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""); };
  // everything card.js needs to draw a card: tiles, their codes, the vCard, colours and photo
  async function build(payload, vcfHref) {
    var c = Object.assign(blank(), payload.c || {}), vc = vcard(Object.assign({}, c, { note: "" })); // the QR's vCard stays lean
    var links = [{ id: "contact", icon: "contact", label: "Save contact", open: vcfHref || URL.createObjectURL(new Blob([vcard(c, payload.photo)], { type: "text/vcard" })), kind: "download", fname: (c.n || "contact") + ".vcf", c: COLORS.contact, fg: "#1a1206", big: true, sub: "Scan to add " + (c.n || "this contact") + " to your contacts", qrText: vc }];
    if (c.p[0]) {
      var tel = c.p[0].replace(/[^\d+]/g, "");
      links.push({ id: "call", icon: "call", label: "Call", open: "tel:" + tel, kind: "app", c: COLORS.call, sub: c.p[0], qrText: "tel:" + tel });
      links.push({ id: "text", icon: "text", label: "Text", open: "sms:" + tel, kind: "app", c: COLORS.text, sub: c.p[0], qrText: "sms:" + tel });
    }
    if (c.e[0]) links.push({ id: "email", icon: "email", label: "Email", open: "mailto:" + c.e[0], kind: "app", c: COLORS.email, sub: c.e[0], qrText: "mailto:" + c.e[0] });
    SOCIAL.forEach(function (s) { if (c.l[s[0]]) links.push({ id: s[0], icon: s[0], label: s[2], open: c.l[s[0]], c: COLORS[s[0]], sub: bare(c.l[s[0]]), qrText: c.l[s[0]] }); });
    if (c.w) links.push({ id: "website", icon: "globe", label: "Website", open: c.w, c: COLORS.website, sub: bare(c.w), qrText: c.w });
    c.x.slice(0, 6).forEach(function (u, i) { var host = bare(u).split("/")[0]; links.push({ id: "link" + i, icon: "link", label: host.length > 14 ? host.slice(0, 13) + "…" : host, open: u, c: COLORS.link, sub: bare(u), qrText: u }); });
    if (c.a) { var maps = "https://maps.google.com/?q=" + encodeURIComponent(c.a); links.push({ id: "map", icon: "map", label: "Address", open: maps, c: COLORS.map, sub: c.a, qrText: maps }); }
    var qr = {};
    for (var i = 0; i < links.length; i++) { qr[links[i].id] = await qrSvg(links[i].qrText); delete links[i].qrText; }
    return { contact: c, links: links, qr: qr, vcf: vc, photo: payload.photo || "", pal: payload.pal || palOf("night", 0), design: payload.design || "classic", back: payload.back || { style: "colour", qr: "contact", line: "", show: {} }, layout: payload.layout || null };
  }
  // #c=… (stored, short link) or #u=… (the older all-in-the-link cards)
  async function theirs(hash) {
    var tok = parseToken(hash);
    if (tok) {
      if (tok.edit) { remember(tok.id, tok.edit); try { history.replaceState(history.state, "", location.pathname + "#c=" + tok.id + tok.s); } catch (e) {} } // keep the edit key off the address bar
      var got = await fetchCard(tok), t = await build(got.payload);
      t.link = linkOf(tok.id, tok.s);
      t.home = { id: tok.id, start: location.origin + "/card/#c=" + tok.id + tok.s }; // its own home-screen app (card.js)
      t.own = { id: tok.id, s: tok.s, edit: tok.edit || recall(tok.id), password: got.password, payload: got.payload };
      if (t.own.edit) {
        var c = t.contact;
        t.links.push({ id: "signature", icon: "signature", label: "Email signature", kind: "signature", c: "linear-gradient(135deg,#ff8fb1,#b197fc)", sub: "Copy it into Gmail or Outlook",
          sig: signature(c, t.link, t.pal), sigText: [c.n, [c.t, c.o].filter(Boolean).join(" · "), c.p[0], c.e[0], "My card: " + t.link].filter(Boolean).join("\n") });
      }
      return t;
    }
    var c = decode(hash);
    if (!c) return null;
    var t2 = await build({ c: c });
    t2.link = location.href;
    return t2;
  }

  /* ================= the builder ================= */
  // steps: capture (paste / photos / files) → reading → form (details, photo) → style (design, colours, back, privacy) → done
  var dlg = null, photos = [], state = blank(), was = null, made = null;
  var photo = "", photoSrc = "", crop = { x: 0, y: 0, z: 1, r: 0 }, src = null, pendingPhoto = "";
  var pal = palOf("night", 0), design = "classic", back = { style: "colour", qr: "contact", line: "", show: {} }, layout = { k: 0.5, z: 0, qs: 0.5, qr: "contact", show: {}, img: "" };
  var FIELDS = [ // name, label, placeholder, input type, autocomplete, wide
    ["n", "Name", "Jane Doe", "text", "name"], ["t", "Title", "Product Designer", "text", "organization-title"], ["o", "Company", "Acme Studio", "text", "organization"],
    ["p", "Phone", "+1 555 123 4567", "tel", "tel"], ["e", "Email", "jane@acme.com", "email", "email"], ["w", "Website", "acme.com", "url", "url"],
    ["linkedin", "LinkedIn", "username or link", "text", "off"], ["github", "GitHub", "username or link", "text", "off"], ["instagram", "Instagram", "@username or link", "text", "off"],
    ["x", "X / Twitter", "@username or link", "text", "off"], ["more", "More links", "Any other links, one per line", "area", "off", 1], ["a", "Address", "123 Main St, Houston, TX", "text", "street-address", 1],
    ["note", "Notes", "Saved in your contact file, not shown on the card", "area", "off", 1],
  ];
  var DESIGN_NAMES = { classic: "Classic", split: "Split", centered: "Centered", bold: "Bold", minimal: "Minimal", image: "Photo only" };
  // the front's checklist: key, label, whether this card has it (c = readForm())
  var SHOW_ITEMS = [["n", "Name", function (c) { return c.n; }], ["t", "Title", function (c) { return c.t; }], ["o", "Company", function (c) { return c.o; }],
    ["photo", "Photo", function () { return photo; }], ["p", "Phone", function (c) { return c.p[0]; }], ["e", "Email", function (c) { return c.e[0]; }],
    ["w", "Website", function (c) { return c.w; }], ["linkedin", "LinkedIn", function (c) { return c.l.linkedin; }], ["github", "GitHub", function (c) { return c.l.github; }],
    ["instagram", "Instagram", function (c) { return c.l.instagram; }], ["x", "X / Twitter", function (c) { return c.l.x; }], ["a", "Address", function (c) { return c.a; }], ["qr", "QR code", function () { return true; }]];
  function reset() {
    palOpened = false;
    state = blank(); photo = ""; photoSrc = ""; src = null; crop = { x: 0, y: 0, z: 1, r: 0 }; pendingPhoto = "";
    pal = palOf("night", 0); design = "classic"; back = { style: "colour", qr: "contact", line: "", show: {} }; layout = { k: 0.5, z: 0, qs: 0.5, qr: "contact", show: {}, img: "" };
  }
  function open() {
    bm("card-make", "open");
    if (!dlg) buildUi();
    was = null; made = null; reset(); photos = []; paintThumbs();
    dlg.querySelector("#mkPaste").value = "";
    setMode();
    show("capture");
    dlg.showModal();
  }
  // the owner of a stored card: change it (step "form") or get its link, files and signature (step "done")
  async function manage(own, step) {
    if (!dlg) buildUi();
    was = own; made = null; reset();
    var p = own.payload || {};
    state = Object.assign(blank(), p.c || {});
    pal = p.pal && p.pal.name ? palOf(p.pal.name, p.pal.rot) : Object.assign({ name: "", rot: 0, card: "#1b1733" }, p.pal || palOf("night", 0));
    design = p.design || "classic"; back = Object.assign({ style: "colour", qr: "contact", line: "", show: {} }, p.back || {}); back.show = Object.assign({}, back.show);
    layout = Object.assign({ k: 0.5, z: 0, qs: 0.5, qr: "contact", show: {}, img: "" }, p.layout || {}); layout.show = Object.assign({}, layout.show);
    setMode();
    fillForm(state);
    dlg.querySelector("#mkPw").value = own.password || "";
    dlg.querySelector("#mkFound").textContent = "Change anything. Your link and QR code stay the same.";
    dlg.showModal();
    if (p.photoSrc || p.photo) { crop = Object.assign({ x: 0, y: 0, z: 1, r: 0 }, p.crop || {}); await loadSrc(p.photoSrc || p.photo); photo = p.photo || photo; paintPhoto(); }
    if (step === "done") { made = { c: state, link: linkOf(own.id, own.s), editLink: own.edit ? linkOf(own.id, own.s, own.edit) : "", payload: p }; paintDone(); show("done"); }
    else show("form");
    bm("card-make", step === "done" ? "manage" : "edit");
  }
  function setMode() {
    dlg.querySelector("#mkTitle").textContent = was ? "Your card" : "Your card, like this one";
    dlg.querySelector('[data-a="make"]').textContent = was ? "Save changes" : "Create my card";
    dlg.querySelector('[data-a="back"]').hidden = !!was;
    dlg.querySelector('[data-a="del"]').hidden = !was;
    dlg.querySelector("#mkEditableRow").hidden = !!was;
    dlg.querySelector("#mkPw").value = "";
    paintPhoto();
  }
  function buildUi() {
    dlg = document.createElement("dialog");
    dlg.className = "mk";
    dlg.setAttribute("aria-labelledby", "mkTitle");
    var chip = function (k) { return '<button type="button" class="mk-pal" data-pal="' + k + '" aria-label="' + k + ' palette">' + PALETTES[k].map(function (c) { return '<i style="background:' + c + '"></i>'; }).join("") + "<span>" + k + "</span></button>"; };
    var pals = PAL_GROUPS.map(function (g, i) {
      return '<details class="mk-palgroup" data-group="' + i + '"><summary>' + g[0] + ' <span class="mk-palsw">' + g[1].slice(0, 5).map(function (k) { return '<i style="background:' + PALETTES[k][2] + '"></i>'; }).join("") + "</span></summary>" +
        '<div class="mk-pals">' + g[1].map(chip).join("") + "</div></details>";
    }).join("");
    dlg.innerHTML =
      '<div class="mk-in"><header class="mk-head"><div><p class="mk-k">Make your own</p><h2 id="mkTitle">Your card, like this one</h2></div><button type="button" class="mk-x" data-a="close" aria-label="Close">✕</button></header>' +
      // 1. capture: paste, photos or files
      '<section class="mk-step" data-step="capture">' +
      '<label class="mk-f mk-pastebox"><span>Paste a contact <small>a vCard, or text shared from your contacts app</small></span><textarea id="mkPaste" rows="3" placeholder="Paste here and it fills itself in"></textarea></label>' +
      '<p class="mk-p">Or take photos of your business card, your phone\'s contact screen or an email signature (front and back is fine), or upload a contact file. <b>Everything is read on this device; photos are never uploaded.</b></p>' +
      '<div class="mk-cap"><label class="mk-big"><input type="file" accept="image/*" capture="environment" multiple hidden data-a="files"><span class="mk-ico">📷</span><b>Take photos</b><small>Opens the camera</small></label>' +
      '<label class="mk-big ghost"><input type="file" accept="image/*,.vcf,.vcard,.txt,text/vcard,text/x-vcard,text/plain" multiple hidden data-a="files"><span class="mk-ico">📁</span><b>Upload files</b><small>Photos, .vcf or .txt</small></label></div>' +
      '<div class="mk-thumbs" id="mkThumbs"></div>' +
      '<div class="mk-row"><button type="button" class="mk-btn primary" data-a="read" disabled>Read it</button><button type="button" class="mk-btn link" data-a="manual">Type it in instead</button></div></section>' +
      // 2. reading
      '<section class="mk-step" data-step="reading"><div class="mk-spin" aria-hidden="true"></div><p class="mk-p" id="mkStatus">Reading…</p><div class="mk-bar"><span id="mkBar"></span></div></section>' +
      // 3. details and photo, with a live preview
      '<section class="mk-step" data-step="form"><div class="mk-prev" id="mkPrev" aria-hidden="true"></div><p class="mk-p" id="mkFound"></p>' +
      '<form class="mk-form" id="mkForm" autocomplete="on">' + FIELDS.map(field).join("") + "</form>" +
      '<div class="mk-sec"><h3>Your photo <small>optional</small></h3><div class="mk-photo"><span class="mk-ph" id="mkPh"></span><div class="mk-photo-btns">' +
      '<label class="mk-btn"><input type="file" accept="image/*" capture="user" hidden data-a="photo">🤳 Selfie</label><label class="mk-btn"><input type="file" accept="image/*" hidden data-a="photo">🖼️ Choose</label>' +
      '<button type="button" class="mk-btn" data-a="adjust" id="mkAdjust">Adjust</button><button type="button" class="mk-btn link" data-a="nophoto" id="mkNoPhoto">Remove</button></div></div>' +
      '<div class="mk-crop" id="mkCrop" hidden><div class="mk-crop-view" id="mkCropView"><canvas id="mkCropCv" width="640" height="640"></canvas><span class="mk-crop-ring" aria-hidden="true"></span></div>' +
      '<div class="mk-crop-tools"><span aria-hidden="true">−</span><input type="range" id="mkZoom" min="1" max="5" step="0.01" value="1" aria-label="Zoom"><span aria-hidden="true">+</span><button type="button" class="mk-btn" data-a="rot" aria-label="Rotate">↻</button><button type="button" class="mk-btn primary" data-a="cropdone">Done</button></div>' +
      '<p class="mk-fine">Drag to move it. Pinch, scroll or use the slider to zoom.</p></div></div>' +
      '<div class="mk-row"><button type="button" class="mk-btn" data-a="back">‹ Photos</button><button type="button" class="mk-btn link danger" data-a="del">Delete this card</button><button type="button" class="mk-btn primary" data-a="tostyle">Next: design ›</button></div></section>' +
      // 4. design: the card itself, its arrangement, palette (and its rotation), back and privacy
      '<section class="mk-step" data-step="style"><div class="mk-stage" id="mkStage"><button type="button" class="mk-card" id="mkCard" aria-label="Flip the card over"><span class="mk-flip"><span class="face front" id="mkFront"></span><span class="face back" id="mkBack"></span></span></button>' +
      '<div class="mk-stage-bar"><button type="button" class="mk-round" data-a="dprev" aria-label="Previous design">‹</button><span class="mk-dname" id="mkDesign">Classic</span><button type="button" class="mk-round" data-a="dnext" aria-label="Next design">›</button>' +
      '<button type="button" class="mk-round wide" data-a="rotate" aria-label="Rotate the colors">↻ Rotate colors</button></div>' +
      '<label class="mk-balance"><span id="mkKa">Bigger text</span><input type="range" id="mkK" min="0" max="100" step="1" value="50" aria-label="Balance between the text and the photo"><span id="mkKb">Bigger photo</span></label>' +
      '<label class="mk-balance" id="mkQsRow"><span>Smaller QR</span><input type="range" id="mkQs" min="0" max="100" step="1" value="40" aria-label="QR code size"><span>Bigger QR</span></label>' +
      '<p class="mk-stage-tip">Tap the card to see its back</p></div>' +
      '<div class="mk-sec"><h3>Colors</h3>' + pals + "</div>" +
      '<details class="mk-sec mk-custom" id="mkCustom"><summary>Choose exactly what\'s on the front <small>optional</small></summary><div class="mk-checks" id="mkChecks"></div>' +
      '<label class="mk-f mk-fqr"><span>The front\'s QR code opens</span><select id="mkFrontQr"></select></label>' +
      '<div class="mk-faceimg"><label class="mk-btn">🖼️ Picture for “Photo only”<input type="file" accept="image/*" data-a="faceimg" hidden></label><button type="button" class="mk-btn link" data-a="noface" id="mkNoFace" hidden>Remove it</button>' +
      '<p class="mk-fine">A finished card design or any picture: it fills the front of the “Photo only” design. Without one, your photo is used.</p></div></details>' +
      '<div class="mk-sec"><h3>Back of the card</h3><div class="mk-seg" role="group" aria-label="Back style"><button type="button" data-back="white">Blank</button><button type="button" data-back="colour">Color + QR</button><button type="button" data-back="photo">With photo</button><button type="button" data-back="double">Double</button></div>' +
      '<p class="mk-fine" id="mkBackHint"></p><div class="mk-checks" id="mkBackChecks"></div>' +
      '<div class="mk-form two" id="mkBackOpts"><label class="mk-f"><span>Its QR code opens</span><select id="mkBackQr"></select></label><label class="mk-f" id="mkBackLineRow"><span>Line under your name</span><input id="mkBackLine" maxlength="60" placeholder="Scan to save the contact"></label></div></div>' +
      '<div class="mk-sec"><h3>Privacy</h3><label class="mk-chk" id="mkEditableRow"><input type="checkbox" id="mkEditable" checked><span>Let me edit it later <small>You get a private edit link; without it nobody can change the card.</small></span></label>' +
      '<label class="mk-f"><span>Password <small>optional</small></span><input type="password" id="mkPw" autocomplete="new-password" placeholder="None: the link alone opens it"></label>' +
      '<p class="mk-fine">Your card is encrypted on this device before it\'s stored, and the key is part of your link, so the server can\'t read it. With a password, people need the link and the password. Adam, who runs adambacch.us, can also open cards to remove abuse or fix problems.</p></div>' +
      '<div class="mk-row"><button type="button" class="mk-btn" data-a="toform">‹ Details</button><button type="button" class="mk-btn primary" data-a="make">Create my card</button></div></section>' +
      // 5. done
      '<section class="mk-step" data-step="done"><div class="mk-done"><div class="mk-qr" id="mkQr"></div><div><p class="mk-k" id="mkDoneK">Your card is ready</p><h3 id="mkName"></h3><a class="mk-short" id="mkShort" target="_blank" rel="noopener"></a></div></div>' +
      '<div class="mk-acts"><button type="button" class="mk-act" data-a="share"><span>📤</span>Share</button><button type="button" class="mk-act" data-a="email"><span>✉️</span>Email it</button><button type="button" class="mk-act" data-a="sms"><span>💬</span>Text it</button>' +
      '<button type="button" class="mk-act" data-a="copy"><span>🔗</span>Copy link</button><a class="mk-act" id="mkVcf" download><span>👤</span>Save .vcf</a><a class="mk-act" id="mkOpen" target="_blank" rel="noopener"><span>✨</span>Open my card</a>' +
      '<button type="button" class="mk-act" data-a="zip"><span>🗂️</span>Website files</button><button type="button" class="mk-act" data-a="sig"><span>✍️</span>Email signature</button><button type="button" class="mk-act" data-a="edit"><span>✎</span>Edit card</button></div>' +
      '<div class="mk-sig" id="mkSig" hidden><div class="mk-sig-stage" id="mkSigStage"></div><div class="mk-row"><p class="mk-fine">Paste into Gmail (Settings → Signature) or Outlook. No images, so nothing extra is hosted. It links to your card.</p><button type="button" class="mk-btn primary" data-a="copysig">Copy signature</button></div></div>' +
      '<div class="mk-editbox" id="mkEditBox"><p class="mk-p small"><b>Your private edit link.</b> Keep it somewhere safe: it\'s the only way to change your card, and anyone who has it can. This device remembers it too.</p><code id="mkEditLink"></code>' +
      '<div class="mk-row"><button type="button" class="mk-btn" data-a="copyedit">Copy edit link</button><button type="button" class="mk-btn" data-a="mailedit">Email it to myself</button></div></div>' +
      '<p class="mk-fine">Encrypted before upload: the server keeps scrambled data it can\'t read (Adam, who runs adambacch.us, can open cards to remove abuse). Website files: your card as a small site you can host anywhere.</p></section></div>';
    document.body.appendChild(dlg);
    dlg.addEventListener("click", onClick);
    dlg.addEventListener("change", function (e) {
      var a = e.target.dataset.a;
      if (a === "files") addFiles(e.target.files, e.target);
      if (a === "photo") { var f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) loadSrc(f, true).catch(function (x) { toast(x.message); }); }
      if (e.target.id === "mkBackQr") { back.qr = e.target.value; paintStyle(); }
      if (e.target.dataset.show) { layout.show[e.target.dataset.show] = e.target.checked; paintStyle(); }
      if (e.target.dataset.bshow) { back.show[e.target.dataset.bshow] = e.target.checked; paintStyle(); }
      if (e.target.id === "mkFrontQr") { layout.qr = e.target.value; paintStyle(); }
      if (a === "faceimg") { var g = e.target.files && e.target.files[0]; e.target.value = ""; if (g) faceImage(g).catch(function (x) { toast(x.message); }); }
    });
    dlg.addEventListener("input", function (e) {
      if (e.target.id === "mkPaste") { pasteChanged(); return; }
      if (e.target.id === "mkBackLine") { back.line = e.target.value; paintStyle(); return; }
      if (e.target.id === "mkQs") { layout.qs = Number(e.target.value) / 100; paintStyle(); return; }
      if (e.target.id === "mkK") { layout[design === "image" ? "z" : "k"] = Number(e.target.value) / 100; paintStyle(); return; }
      if (e.target.id === "mkZoom") { crop.z = Number(e.target.value); clampCrop(); drawCrop(); settleCrop(); return; }
      if (e.target.closest("#mkForm")) paintPreview();
    });
    dlg.querySelector("#mkPaste").addEventListener("paste", function () { setTimeout(function () { if (dlg.querySelector("#mkPaste").value.trim() && !photos.length) read(); }, 0); }); // paste → straight to the form
    dlg.addEventListener("dragover", function (e) { e.preventDefault(); });
    dlg.addEventListener("drop", function (e) { e.preventDefault(); if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    cropEvents();
  }
  function field(f) {
    var k = f[0], type = f[3], attrs = ' name="' + k + '" placeholder="' + esc(f[2]) + '" autocomplete="' + f[4] + '"';
    var input = type === "area" ? "<textarea" + attrs + ' rows="2"></textarea>'
      : "<input" + attrs + ' type="' + type + '"' + (type === "tel" ? ' inputmode="tel"' : type === "email" ? ' inputmode="email"' : type === "url" ? ' inputmode="url"' : "") +
        (k === "n" ? ' autocapitalize="words"' : SOCIAL_BY[k] ? ' autocapitalize="off" spellcheck="false"' : "") + ">";
    return '<label class="mk-f' + (f[5] ? " wide" : "") + '"><span>' + f[1] + "</span>" + input + "</label>";
  }
  function show(step) {
    dlg.querySelectorAll(".mk-step").forEach(function (s) { s.classList.toggle("on", s.dataset.step === step); });
    if (step === "form") paintPreview();
    if (step === "style") { openPalGroup(); paintStyle(); }
    dlg.scrollTop = 0;
  }

  /* ----- capture: pasted text, files (photos, .vcf, .txt) ----- */
  var PHOTO_LINE = /^PHOTO[;:][^\n]*(?:\r?\n[ \t][^\n]*)*\r?\n?/gim;
  function takePhotoOut(text) { // a vCard's photo becomes the card photo instead of a wall of text in the box
    if (!/^PHOTO[;:]/im.test(text)) return text;
    var c = blank(); fromQr(text, c);
    if (c.photoData) pendingPhoto = c.photoData;
    return text.replace(PHOTO_LINE, "");
  }
  function pasteChanged() {
    var box = dlg.querySelector("#mkPaste"), v = box.value;
    if (/^PHOTO[;:]/im.test(v)) box.value = takePhotoOut(v);
    paintThumbs();
  }
  function addFiles(list, input) {
    var box = dlg.querySelector("#mkPaste");
    Array.prototype.forEach.call(list || [], function (f) {
      if (/^image\//.test(f.type) || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name)) photos.push(f);
      else if (/^text\//.test(f.type) || /\.(vcf|vcard|txt)$/i.test(f.name)) f.text().then(function (t) { box.value = (box.value.trim() ? box.value.trim() + "\n\n" : "") + takePhotoOut(t).trim(); paintThumbs(); });
    });
    if (input) input.value = "";
    paintThumbs();
  }
  function paintThumbs() {
    var box = dlg.querySelector("#mkThumbs"), text = dlg.querySelector("#mkPaste").value.trim();
    box.innerHTML = photos.map(function (f, i) { return '<span class="mk-th"><img alt="" src="' + URL.createObjectURL(f) + '"><button type="button" data-a="rm" data-i="' + i + '" aria-label="Remove photo">✕</button></span>'; }).join("");
    dlg.querySelector('[data-a="read"]').disabled = !photos.length && !text;
  }
  async function read() {
    show("reading");
    var status = dlg.querySelector("#mkStatus"), bar = dlg.querySelector("#mkBar");
    var c = blank(), qrs = 0, text = dlg.querySelector("#mkPaste").value;
    try {
      if (text.trim()) { status.textContent = "Reading what you pasted…"; fromPaste(text, c); }
      for (var i = 0; i < photos.length; i++) {
        var base = i / photos.length, span = 1 / photos.length;
        status.textContent = "Photo " + (i + 1) + " of " + photos.length + ": looking for QR codes…";
        bar.style.width = Math.round(base * 100) + "%";
        var img = await loadImage(photos[i]);
        (await findQrs(canvasOf(img, 1400))).forEach(function (t) { if (fromQr(t, c)) qrs++; });
        status.textContent = "Photo " + (i + 1) + " of " + photos.length + ": reading the text…" + (i === 0 && !worker ? " (the first time takes a few seconds)" : "");
        var lines = await ocr(canvasOf(img, 2000), function (p) { bar.style.width = Math.round((base + span * p) * 100) + "%"; });
        fromText(lines, c);
      }
      bar.style.width = "100%";
      if (c.photoData) { pendingPhoto = pendingPhoto || c.photoData; delete c.photoData; }
      state = c;
      fillForm(c);
      if (pendingPhoto && !photo) { await loadSrc(pendingPhoto, true).catch(function () {}); pendingPhoto = ""; }
      var got = ["n", "t", "o"].filter(function (k) { return c[k]; }).length + c.p.length + c.e.length + (c.w ? 1 : 0) + Object.keys(c.l).length + c.x.length + (c.a ? 1 : 0);
      dlg.querySelector("#mkFound").textContent = got ? "Found " + got + " detail" + (got === 1 ? "" : "s") + (qrs ? ", including a QR code" : "") + (c.note ? ". Anything else it read is under Notes" : "") + ". Check them and fill in anything missed." : "Couldn't read much from that. Fill in your details below, or try a sharper, flatter photo.";
      bm("card-make", "read " + got);
      show("form");
    } catch (e) {
      dlg.querySelector("#mkFound").textContent = e.message + " You can type your details instead.";
      fillForm(c);
      show("form");
    }
  }

  /* ----- details ----- */
  function fillForm(c) {
    var f = dlg.querySelector("#mkForm");
    var set = function (k, v) { if (f.elements[k]) { f.elements[k].value = v || ""; f.elements[k].parentNode.classList.toggle("found", !!v && !was); } };
    set("n", c.n); set("t", c.t); set("o", c.o); set("p", c.p.join(", ")); set("e", c.e.join(", ")); set("w", c.w); set("a", c.a); set("note", c.note);
    ["linkedin", "github", "instagram", "x"].forEach(function (k) { set(k, handleOf(k, c.l[k])); });
    set("more", c.x.concat(["facebook", "youtube", "tiktok"].map(function (k) { return c.l[k]; }).filter(Boolean)).join("\n"));
  }
  function readForm() {
    var f = dlg.querySelector("#mkForm"), v = function (k) { return (f.elements[k].value || "").trim(); };
    var c = blank();
    c.n = v("n"); c.t = v("t"); c.o = v("o"); c.a = v("a"); c.note = v("note");
    v("p").split(/[,;]/).forEach(function (p) { if (String(p).replace(/\D/g, "").length >= 7) addUnique(c.p, p, digits); });
    v("e").split(/[,;\s]+/).forEach(function (m) { if (/@/.test(m)) addUnique(c.e, m); });
    if (v("w")) c.w = cleanUrl(v("w"));
    ["linkedin", "github", "instagram", "x"].forEach(function (k) { var u = social(k, v(k)); if (u) c.l[k] = u; });
    v("more").split(/[\n,]+/).map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (u) {
      var url = cleanUrl(u), hit = SOCIAL.filter(function (s) { return s[1].test(url); })[0];
      if (hit) { if (!c.l[hit[0]]) c.l[hit[0]] = url; } else addUnique(c.x, url);
    });
    return c;
  }
  function paintPreview() {
    var box = dlg && dlg.querySelector("#mkPrev");
    if (!box || !window.CardFace) return;
    box.innerHTML = '<span class="face">' + window.CardFace.front(readForm(), photo, design, layout) + "</span>";
    window.CardFace.palette(pal, box);
  }

  /* ----- photo: move, zoom and turn it like a profile picture; kept as the source plus the crop, so it can be redone ----- */
  function imageOf(srcUrl) {
    return new Promise(function (ok, no) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { no(new Error("That photo couldn't be opened")); }; i.src = srcUrl; });
  }
  // "Photo only" front: the picture covers the card (1400×800), kept small enough for the encrypted card
  async function faceImage(file) {
    var img = await loadImage(file), W = 1400, H = 800, cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    var sc = Math.max(W / img.naturalWidth, H / img.naturalHeight), w = img.naturalWidth * sc, h = img.naturalHeight * sc;
    cv.getContext("2d").drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    var url = cv.toDataURL("image/jpeg", 0.9);
    for (var q = 0.84; url.length > 480000 && q > 0.5; q -= 0.06) url = cv.toDataURL("image/jpeg", q);
    layout.img = url; design = "image"; paintStyle(); bm("card-make", "face-image");
  }
  async function loadSrc(fileOrUrl, fresh) {
    var img = typeof fileOrUrl === "string" ? await imageOf(fileOrUrl) : await loadImage(fileOrUrl);
    var s = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight)), cv = document.createElement("canvas");
    cv.width = Math.round(img.naturalWidth * s); cv.height = Math.round(img.naturalHeight * s);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    var url = cv.toDataURL("image/jpeg", 0.9);
    for (var q = 0.84; url.length > 600000 && q > 0.5; q -= 0.06) url = cv.toDataURL("image/jpeg", q);
    photoSrc = url; src = cv;
    if (fresh) crop = { x: 0, y: cv.height > cv.width ? 0.08 : 0, z: 1, r: 0 }; // portraits: a little room above the head
    clampCrop();
    dlg.querySelector("#mkCrop").hidden = false;
    drawCrop(); renderPhoto();
    if (fresh) bm("card-make", "photo");
  }
  function dims() {
    var turned = crop.r % 180 !== 0, w = turned ? src.height : src.width, h = turned ? src.width : src.height, a = w / h;
    return { W: crop.z * Math.max(1, a), H: crop.z * Math.max(1, 1 / a), w: w };
  }
  function clampCrop() {
    if (!src) return;
    var d = dims(), mx = (d.W - 1) / 2, my = (d.H - 1) / 2;
    crop.x = Math.max(-mx, Math.min(mx, crop.x)); crop.y = Math.max(-my, Math.min(my, crop.y));
  }
  function drawTo(cv) {
    var s = cv.width, ctx = cv.getContext("2d"), d = dims(), k = (d.W * s) / d.w;
    ctx.fillStyle = "#111"; ctx.fillRect(0, 0, s, s);
    ctx.save(); ctx.translate(s / 2 + crop.x * s, s / 2 + crop.y * s); ctx.rotate(crop.r * Math.PI / 180); ctx.scale(k, k);
    ctx.imageSmoothingQuality = "high"; ctx.drawImage(src, -src.width / 2, -src.height / 2); ctx.restore();
  }
  function drawCrop() { if (src) { drawTo(dlg.querySelector("#mkCropCv")); dlg.querySelector("#mkZoom").value = crop.z; } }
  function renderPhoto() {
    if (!src) return;
    var out = document.createElement("canvas"); out.width = out.height = 1024; // sharp even when the photo fills most of the card
    drawTo(out);
    photo = out.toDataURL("image/jpeg", 0.9);
    if (photo.length > 280000) photo = out.toDataURL("image/jpeg", 0.8);
    paintPhoto(); paintPreview();
  }
  var settleT = 0;
  function settleCrop() { clearTimeout(settleT); settleT = setTimeout(renderPhoto, 140); }
  function cropEvents() {
    var view = dlg.querySelector("#mkCropView"), pts = new Map(), last = null;
    var spread = function () { var a = Array.from(pts.values()); return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); };
    view.addEventListener("pointerdown", function (e) { view.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); last = pts.size === 2 ? { d: spread(), z: crop.z } : null; });
    view.addEventListener("pointermove", function (e) {
      if (!pts.has(e.pointerId) || !src) return;
      var prev = pts.get(e.pointerId), size = view.getBoundingClientRect().width;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2 && last) crop.z = Math.max(1, Math.min(5, last.z * spread() / last.d));
      else if (pts.size === 1) { crop.x += (e.clientX - prev.x) / size; crop.y += (e.clientY - prev.y) / size; }
      clampCrop(); drawCrop();
    });
    var up = function (e) { pts.delete(e.pointerId); last = pts.size === 2 ? { d: spread(), z: crop.z } : null; settleCrop(); };
    view.addEventListener("pointerup", up); view.addEventListener("pointercancel", up);
    view.addEventListener("wheel", function (e) { if (!src) return; e.preventDefault(); crop.z = Math.max(1, Math.min(5, crop.z * Math.exp(-e.deltaY * 0.0015))); clampCrop(); drawCrop(); settleCrop(); }, { passive: false });
  }
  function paintPhoto() {
    var ph = dlg.querySelector("#mkPh");
    ph.style.backgroundImage = photo ? "url(" + photo + ")" : "";
    ph.classList.toggle("empty", !photo);
    dlg.querySelector("#mkNoPhoto").hidden = !photo;
    dlg.querySelector("#mkAdjust").hidden = !photo;
    if (!photo) dlg.querySelector("#mkCrop").hidden = true;
  }

  /* ----- design step: the real card, flipped by a tap ----- */
  function targetOf(c, id) {
    if (id === "contact") return vcard(Object.assign({}, c, { note: "" }));
    var tel = (c.p[0] || "").replace(/[^\d+]/g, "");
    if (id === "call") return tel && "tel:" + tel;
    if (id === "text") return tel && "sms:" + tel;
    if (id === "email") return c.e[0] && "mailto:" + c.e[0];
    if (id === "website") return c.w;
    if (/^link\d$/.test(id)) return c.x[Number(id.slice(4))];
    return c.l[id];
  }
  function backChoices(c) {
    var out = [["contact", "Save the contact"]];
    if (c.p[0]) out.push(["call", "Call " + c.p[0]], ["text", "Text " + c.p[0]]);
    if (c.e[0]) out.push(["email", "Email " + c.e[0]]);
    SOCIAL.forEach(function (s) { if (c.l[s[0]]) out.push([s[0], s[2]]); });
    if (c.w) out.push(["website", bare(c.w)]);
    c.x.slice(0, 6).forEach(function (u, i) { out.push(["link" + i, bare(u)]); });
    return out;
  }
  var qrCache = {}, styleN = 0;
  function checklist(c, sel, attr, picked, defaults, only) {
    dlg.querySelector(sel).innerHTML = SHOW_ITEMS.map(function (it) {
      var has = !!it[2](c), on = it[0] in picked ? picked[it[0]] : !!defaults[it[0]], ok = has && (!only || only.indexOf(it[0]) >= 0);
      return '<label' + (has ? "" : ' class="off" title="Not filled in"') + '><input type="checkbox" ' + attr + '="' + it[0] + '"' + (on ? " checked" : "") + (ok ? "" : " disabled") + ">" + it[1] + "</label>";
    }).join("");
  }
  var qrOf = async function (text) { return qrCache[text] || (qrCache[text] = await qrSvg(text)); };
  var palOpened = false;
  function openPalGroup() {
    if (palOpened) return;
    palOpened = true;
    var gi = 0; PAL_GROUPS.forEach(function (g, i) { if (g[1].indexOf(pal.name) >= 0) gi = i; });
    dlg.querySelectorAll(".mk-palgroup").forEach(function (d) { d.open = Number(d.dataset.group) === gi; });
  }
  async function paintStyle() {
    var n = ++styleN, c = readForm(), choices = backChoices(c);
    var opts = function (cur) { return choices.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === cur ? " selected" : "") + ">" + esc(x[1]) + "</option>"; }).join(""); };
    if (!choices.some(function (x) { return x[0] === back.qr; })) back.qr = "contact";
    if (!choices.some(function (x) { return x[0] === layout.qr; })) layout.qr = "contact";
    dlg.querySelector("#mkBackQr").innerHTML = opts(back.qr);
    dlg.querySelector("#mkFrontQr").innerHTML = opts(layout.qr);
    var line = dlg.querySelector("#mkBackLine");
    if (document.activeElement !== line) line.value = back.line || "";
    line.placeholder = back.qr === "contact" ? "Scan to save the contact" : "Scan for " + choices.filter(function (x) { return x[0] === back.qr; })[0][1];
    dlg.querySelector("#mkDesign").textContent = DESIGN_NAMES[design];
    dlg.querySelectorAll(".mk-pal").forEach(function (b) { b.classList.toggle("on", b.dataset.pal === pal.name); });
    if (back.style === "photo" && !photo) back.style = "colour";
    dlg.querySelectorAll("[data-back]").forEach(function (b) { b.classList.toggle("on", b.dataset.back === back.style); b.disabled = b.dataset.back === "photo" && !photo; });
    dlg.querySelector("#mkBackHint").textContent = { white: "Nothing on the back: just the card color.", colour: "Your QR code and name on the card color.", photo: "Your QR code beside your photo.", double: "A second face: tick what goes on it." }[back.style] || "";
    dlg.querySelector("#mkBackOpts").hidden = back.style === "white";
    dlg.querySelector("#mkBackLineRow").hidden = back.style === "double";
    var bc = dlg.querySelector("#mkBackChecks"); bc.hidden = back.style !== "double";
    if (back.style === "double") checklist(c, "#mkBackChecks", "data-bshow", back.show, window.CardFace.backShown);
    var stage = dlg.querySelector("#mkStage");
    window.CardFace.palette(pal, stage);
    var kIn = dlg.querySelector("#mkK"); if (document.activeElement !== kIn) kIn.value = Math.round((design === "image" ? layout.z : layout.k) * 100);
    var qIn = dlg.querySelector("#mkQs"); if (document.activeElement !== qIn) qIn.value = Math.round(layout.qs * 100);
    dlg.querySelector("#mkKa").textContent = design === "image" ? "Whole picture" : "Bigger text";
    dlg.querySelector("#mkKb").textContent = design === "image" ? "Zoom in" : photo ? "Bigger photo" : "Smaller text";
    var qrOn = "qr" in layout.show ? layout.show.qr : !!window.CardFace.shown.qr;
    dlg.querySelector("#mkQsRow").hidden = !qrOn;
    checklist(c, "#mkChecks", "data-show", layout.show, window.CardFace.shown, design === "image" ? ["qr"] : null);
    dlg.querySelector("#mkNoFace").hidden = !layout.img;
    var fsvg = await qrOf(targetOf(c, layout.qr) || ""), bsvg = await qrOf(targetOf(c, back.qr) || "");
    if (n !== styleN) return; // a newer paint is on its way
    dlg.querySelector("#mkFront").innerHTML = window.CardFace.front(c, photo, design, layout, fsvg);
    var bf = window.CardFace.back(c, bsvg, back, photo, line.placeholder, design, layout);
    var b = dlg.querySelector("#mkBack"); b.className = bf.cls; b.innerHTML = bf.html;
  }

  /* ----- create / save ----- */
  async function make() {
    var c = readForm();
    if (!c.n && !c.p.length && !c.e.length) { toast("Add at least a name, phone or email"); show("form"); return; }
    var btn = dlg.querySelector('[data-a="make"]'), label = btn.textContent;
    btn.disabled = true; btn.textContent = was ? "Saving…" : "Encrypting and saving…";
    try {
      var payload = { v: 2, c: c, photo: photo, photoSrc: photo ? photoSrc : "", crop: photo ? crop : null, pal: pal, design: design, back: back, layout: layout };
      var r = await store(payload, { password: dlg.querySelector("#mkPw").value, editable: dlg.querySelector("#mkEditable").checked, was: was });
      made = { c: c, link: r.link, editLink: r.editLink, payload: payload };
      if (was) {
        bm("card-make", "saved");
        if (location.hash.indexOf(was.id) >= 0) { location.reload(); return; } // on the card itself: redraw it, its tiles and every QR from the new details
        was.payload = payload; was.password = dlg.querySelector("#mkPw").value;
        paintDone(); show("done"); toast("Saved");
        return;
      }
      was = { id: r.id, s: r.s, edit: r.edit, password: dlg.querySelector("#mkPw").value, payload: payload };
      bm("card-make", "made");
      if (r.edit) remember(r.id, r.edit);
      try { sessionStorage.setItem("card.fresh." + r.id, "1"); if (was.password) sessionStorage.setItem("card.pw." + r.id, was.password); } catch (e) {}
      location.href = "/card/#c=" + r.id + r.s; // card.js reloads into the new card; CardMaker.ready() greets it
      return;
    } catch (e) { toast(e.message); }
    finally { btn.disabled = false; btn.textContent = label; }
  }
  async function paintDone() {
    var c = made.c;
    dlg.querySelector("#mkName").textContent = c.n || "Your card";
    var a = dlg.querySelector("#mkShort"); a.href = made.link; a.textContent = made.link.replace(/^https?:\/\//, "");
    dlg.querySelector("#mkQr").innerHTML = await qrSvg(made.link);
    var v = dlg.querySelector("#mkVcf");
    v.href = URL.createObjectURL(new Blob([vcard(c, made.payload.photo)], { type: "text/vcard" }));
    v.setAttribute("download", (c.n || "contact") + ".vcf");
    dlg.querySelector("#mkOpen").href = made.link;
    var box = dlg.querySelector("#mkEditBox");
    box.hidden = !made.editLink;
    dlg.querySelector("#mkEditLink").textContent = made.editLink;
    dlg.querySelector('[data-a="mailedit"]').hidden = !c.e[0];
    dlg.querySelector('[data-a="edit"]').hidden = !made.editLink;
    dlg.querySelector("#mkSig").hidden = true;
  }
  // a card just made: its page opens with this popup (link, edit link, website files)
  function ready(own) {
    var p = own.payload || {}, c = Object.assign(blank(), p.c || {});
    made = { c: c, link: linkOf(own.id, own.s), editLink: own.edit ? linkOf(own.id, own.s, own.edit) : "", payload: p };
    var d = document.createElement("dialog");
    d.className = "mk mk-ready";
    d.innerHTML = '<div class="mk-in"><button type="button" class="mk-x" data-r="close" aria-label="Close">✕</button><p class="mk-k">Your card is ready 🎉</p><h2>' + esc(c.n || "Your card") + "</h2>" +
      '<p class="mk-p small">This page is your card. Share its link: people can save you, call, text or scan from it.</p>' +
      '<a class="mk-short" href="' + esc(made.link) + '" target="_blank" rel="noopener">' + esc(made.link.replace(/^https?:\/\//, "")) + "</a>" +
      '<div class="mk-acts three"><button type="button" class="mk-act" data-r="share"><span>📤</span>Share</button><button type="button" class="mk-act" data-r="copy"><span>🔗</span>Copy link</button><button type="button" class="mk-act" data-r="zip"><span>🗂️</span>Website files</button></div>' +
      (made.editLink ? '<div class="mk-editbox"><p class="mk-p small"><b>Your private edit link.</b> Keep it somewhere safe: it\'s the only way to change your card, and anyone who has it can. This device remembers it too.</p><code>' + esc(made.editLink) + "</code>" +
        '<div class="mk-row"><button type="button" class="mk-btn primary" data-r="copyedit">Copy edit link</button>' + (c.e[0] ? '<button type="button" class="mk-btn" data-r="mailedit">Email it to myself</button>' : "") + "</div></div>" : "") +
      (made.editLink ? '<p class="mk-fine">Your email signature is on the page: tap the ✍️ Email signature button to see it large and copy it.</p>' : "") +
      '<div class="mk-row"><button type="button" class="mk-btn primary" data-r="close">See my card</button></div></div>';
    document.body.appendChild(d);
    d.addEventListener("click", function (e) {
      if (e.target === d) return d.close();
      var b = e.target.closest("[data-r]"); if (!b) return;
      var a = b.dataset.r;
      if (a === "close") d.close();
      else if (a === "zip") bundle().catch(function (x) { toast(x.message); });
      else act(a);
    });
    d.addEventListener("close", function () { d.remove(); });
    d.showModal();
    bm("card-make", "ready");
  }
  function message(c, url) { return (c.n ? c.n : "My contact") + (c.t ? ", " + c.t : "") + (c.o ? " · " + c.o : "") + "\n" + url; }
  async function copyText(s, ok) {
    try { await navigator.clipboard.writeText(s); toast(ok); } catch (e) { prompt("Copy this", s); }
  }
  async function act(a) {
    if (!made) return;
    var c = made.c, url = made.link, msg = message(c, url), subj = "Contact: " + (c.n || "my details");
    bm("card-make", a);
    if (a === "email") location.href = "mailto:?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(msg);
    if (a === "sms") location.href = "sms:?&body=" + encodeURIComponent(msg);
    if (a === "copy") copyText(url, "Link copied");
    if (a === "copyedit") copyText(made.editLink, "Edit link copied. Keep it private");
    if (a === "mailedit") location.href = "mailto:" + encodeURIComponent(c.e[0]) + "?subject=" + encodeURIComponent("My card's private edit link") + "&body=" + encodeURIComponent("Open this to change my card (keep it private):\n" + made.editLink + "\n\nThe card itself, to share:\n" + url);
    if (a === "share") {
      var file = new File([vcard(c, made.payload.photo)], (c.n || "contact") + ".vcf", { type: "text/vcard" });
      var data = navigator.canShare && navigator.canShare({ files: [file] }) ? { title: subj, text: msg, files: [file] } : { title: subj, text: msg, url: url };
      if (navigator.share) navigator.share(data).catch(function () {}); else act("copy");
    }
    if (a === "zip") bundle().catch(function (e) { toast(e.message); });
    if (a === "sig") { var box = dlg.querySelector("#mkSig"); box.hidden = !box.hidden; if (!box.hidden) { dlg.querySelector("#mkSigStage").innerHTML = signature(c, url, made.payload.pal || pal); box.scrollIntoView({ behavior: "smooth", block: "nearest" }); } }
    if (a === "copysig") copySig(c, url);
  }

  /* ----- website files: the card as a small site anyone can host (index.html, card.css, card.js, card-data.js) ----- */
  async function bundle() {
    toast("Packing your files…");
    await lib("jszip");
    var p = made.payload, t = await build(p, "contact.vcf"), zip = new window.JSZip();
    var photoFile = "";
    if (t.photo) {
      var ext = (t.photo.match(/^data:image\/(\w+)/) || [, "jpg"])[1].replace("jpeg", "jpg");
      photoFile = "photo." + ext;
      zip.file(photoFile, t.photo.split(",")[1], { base64: true });
      t.photo = photoFile;
    }
    if (t.layout && /^data:image/.test(t.layout.img || "")) { zip.file("front.jpg", t.layout.img.split(",")[1], { base64: true }); t.layout = Object.assign({}, t.layout, { img: "front.jpg" }); }
    delete t.vcf;
    var cssEl = document.querySelector('link[rel="stylesheet"][href*="card.css"]'), jsEl = document.querySelector('script[src*="card.js"]');
    var got = await Promise.all([fetch(cssEl.href).then(function (r) { return r.text(); }), fetch(jsEl.src).then(function (r) { return r.text(); }), fetch(location.pathname, { cache: "no-store" }).then(function (r) { return r.text(); })]);
    var doc = new DOMParser().parseFromString(got[2], "text/html");
    doc.querySelectorAll('script, link[rel="manifest"], link[rel="apple-touch-icon"], link[rel="preload"], link[rel="canonical"], meta[property^="og:"], meta[name^="apple-"], meta[name="mobile-web-app-capable"], #makeBtn, #installBtn').forEach(function (n) { n.remove(); });
    var c = t.contact, name = c.n || "Contact";
    doc.title = name + " · Card";
    var d = doc.querySelector('meta[name="description"]'); if (d) d.setAttribute("content", [name, c.t, c.o].filter(Boolean).join(" · "));
    var tc = doc.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute("content", t.pal.bg);
    doc.querySelector('link[rel="stylesheet"]').setAttribute("href", "card.css");
    doc.querySelector("#cardFront").innerHTML = ""; doc.querySelector("#cardBack").innerHTML = "";
    var mw = doc.querySelector("#madeWith"); if (mw) mw.innerHTML = 'Made with <a href="https://adambacch.us/card/">adambacch.us/card</a>';
    ["card-data.js", "card.js"].forEach(function (src) { var s = doc.createElement("script"); s.src = src; doc.body.appendChild(s); });
    zip.file("index.html", "<!doctype html>\n" + doc.documentElement.outerHTML + "\n");
    zip.file("card.css", got[0]);
    zip.file("card.js", got[1]);
    zip.file("card-data.js", "/* " + name + "'s card. Edit the details here, or make a new card at https://adambacch.us/card/ */\nwindow.CARD_THEIRS = " + JSON.stringify(t, null, 1) + ";\n");
    zip.file("contact.vcf", vcard(c, p.photo));
    zip.file("README.txt", name + "'s card as a small website\n\nUpload these files to any web host (GitHub Pages, Netlify, Cloudflare Pages, your own site) and open index.html.\nIt also works straight from your computer: double-click index.html.\n\nindex.html    the page\ncard.css      the look\ncard.js       taps, QR codes, the full-screen scan view\ncard-data.js  your details, links, QR codes and colors\ncontact.vcf   your contact file\n" + (photoFile ? photoFile + "     your photo\n" : "") + "\nNothing here talks to adambacch.us: no tracking and no outside libraries.\n");
    var blob = await zip.generateAsync({ type: "blob" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name.replace(/[^\w .-]+/g, "").trim().replace(/\s+/g, "-") + "-card.zip";
    document.body.appendChild(a); a.click(); a.remove();
    toast("Website files downloaded");
  }

  /* ----- email signature: tables and inline styles for mail clients, no images, so nothing has to be hosted ----- */
  function signature(c, link, p) {
    var FONT = "'Segoe UI',Helvetica,Arial,sans-serif", A = (p && p.glow) || "#6d5dfc";
    var ini = (c.n || "?").trim().split(/\s+/).map(function (w) { return w[0]; }).filter(Boolean);
    ini = (ini.length > 1 ? ini[0] + ini[ini.length - 1] : ini[0] || "?").toUpperCase();
    var LABEL = "font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:18px;font-weight:700;color:#ffffff;text-align:center;";
    var icon = function (href, title, text, color) { return '<td width="18" height="18" bgcolor="' + color + '" align="center" valign="middle" style="width:18px;height:18px;min-width:18px;max-height:18px;background:' + color + ';text-align:center;padding:0;"><a href="' + esc(href) + '" title="' + title + '" style="display:block;width:18px;height:18px;' + LABEL + 'text-decoration:none;">' + text + "</a></td>"; };
    var gap = '<td width="4" style="width:4px;font-size:0;line-height:0;">&nbsp;</td>';
    var icons = [["linkedin", "LinkedIn", "in", "#0a66c2"], ["github", "GitHub", "gh", "#24292f"], ["instagram", "Instagram", "ig", "#c13584"], ["x", "X", "x", "#111111"]]
      .filter(function (i) { return c.l[i[0]]; }).map(function (i) { return icon(c.l[i[0]], i[1], i[2], i[3]); }).join(gap);
    var role = [c.t, c.o].filter(Boolean).map(esc).join(" &middot; ");
    var reach = [];
    if (c.p[0]) reach.push('<a href="tel:' + esc(c.p[0].replace(/[^\d+]/g, "")) + '" style="color:#6b6880;text-decoration:none;">' + esc(c.p[0]) + "</a>");
    if (c.e[0]) reach.push('<a href="mailto:' + esc(c.e[0]) + '" style="color:#6b6880;text-decoration:none;">' + esc(c.e[0]) + "</a>");
    if (c.w) reach.push('<a href="' + esc(c.w) + '" style="color:#6b6880;text-decoration:none;">' + esc(bare(c.w)) + "</a>");
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:' + FONT + ';color:#1f1d2b;"><tr>' +
      '<td valign="middle" width="46" style="width:46px;padding:0 10px 0 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td width="46" height="46" bgcolor="' + A + '" align="center" valign="middle" style="width:46px;height:46px;background:' + A + ';text-align:center;"><a href="' + esc(link) + '" style="display:block;width:46px;line-height:46px;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:800;color:#ffffff;text-decoration:none;">' + esc(ini) + "</a></td></tr></table></td>" +
      '<td valign="middle" style="border-left:2px solid ' + A + ';padding:0 0 0 10px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>' +
      '<td valign="middle" style="font-family:' + FONT + ';font-size:15px;line-height:20px;font-weight:700;white-space:nowrap;padding-right:10px;"><a href="' + esc(link) + '" style="color:#1f1d2b;text-decoration:none;">' + esc(c.n || "") + "</a></td>" +
      (icons ? '<td valign="middle"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>' + icons + "</tr></table></td>" : "") + "</tr></table>" +
      '<div style="font-family:' + FONT + ';font-size:12px;line-height:18px;color:#6b6880;padding-top:2px;white-space:nowrap;">' + (role ? role + " &middot; " : "") + '<a href="' + esc(link) + '" style="color:' + A + ';font-weight:700;text-decoration:none;">My card&nbsp;&#8599;</a></div>' +
      (reach.length ? '<div style="font-family:' + FONT + ';font-size:11px;line-height:16px;color:#6b6880;white-space:nowrap;">' + reach.join(" &middot; ") + "</div>" : "") +
      "</td></tr></table>";
  }
  async function copySig(c, link) {
    var html = signature(c, link, made.payload.pal || pal);
    var text = [c.n, [c.t, c.o].filter(Boolean).join(" · "), c.p[0], c.e[0], "My card: " + link].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })]);
      toast("Signature copied");
    } catch (e) {
      var r = document.createRange(); r.selectNodeContents(dlg.querySelector("#mkSigStage"));
      var s = getSelection(); s.removeAllRanges(); s.addRange(r);
      toast(document.execCommand("copy") ? "Signature copied" : "Select the signature and copy it");
      s.removeAllRanges();
    }
    bm("card-make", "sig-copy");
  }
  async function del() {
    if (!was || !was.edit) return;
    if (!confirm("Delete this card for good? Its link and QR code will stop working.")) return;
    try { await api("DELETE", was.id, null, was.edit); remember(was.id, ""); bm("card-make", "deleted"); location.href = location.pathname; }
    catch (e) { toast(e.message); }
  }

  function toast(m) {
    var t = document.getElementById("toast"); if (!t) return alert(m);
    var top = Array.prototype.slice.call(document.querySelectorAll("dialog[open]")).pop();
    if (top && t.parentNode !== top) { top.appendChild(t); top.addEventListener("close", function () { document.body.appendChild(t); }, { once: true }); } // above the modal
    t.textContent = m; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove("on"); }, 2400);
  }
  function onClick(e) {
    var t = e.target.closest("[data-a],[data-pal],[data-back],#mkCard");
    if (!t) return;
    if (t.id === "mkCard") { t.classList.toggle("flipped"); return; }
    if (t.dataset.pal) { pal = t.dataset.pal === pal.name ? palOf(pal.name, pal.rot + 1) : palOf(t.dataset.pal, 0); paintStyle(); bm("card-make", t.dataset.pal === pal.name && pal.rot ? "rotate" : "palette"); return; }
    if (t.dataset.back) { back.style = t.dataset.back; paintStyle(); return; }
    var a = t.dataset.a, D = window.CardFace.designs;
    if (a === "close") dlg.close();
    if (a === "rm") { photos.splice(Number(t.dataset.i), 1); paintThumbs(); }
    if (a === "read") read();
    if (a === "manual") { fillForm(state); dlg.querySelector("#mkFound").textContent = "Fill in what you'd like on your card."; show("form"); }
    if (a === "back") show("capture");
    if (a === "tostyle") { var c = readForm(); if (!c.n && !c.p.length && !c.e.length) { toast("Add at least a name, phone or email"); return; } show("style"); }
    if (a === "toform") show("form");
    if (a === "dprev" || a === "dnext") { design = D[(D.indexOf(design) + (a === "dnext" ? 1 : -1) + D.length) % D.length]; paintStyle(); }
    if (a === "rotate") { pal = PALETTES[pal.name] ? palOf(pal.name, pal.rot + 1) : { name: "", rot: 0, bg: pal.card, card: pal.accent, accent: pal.glow, glow: pal.bg }; paintStyle(); bm("card-make", "rotate"); }
    if (a === "make") make();
    if (a === "edit") { fillForm(made.c); show("form"); }
    if (a === "del") del();
    if (a === "adjust") { var cr = dlg.querySelector("#mkCrop"); cr.hidden = !cr.hidden; if (!cr.hidden) drawCrop(); }
    if (a === "rot") { crop.r = (crop.r + 90) % 360; clampCrop(); drawCrop(); renderPhoto(); }
    if (a === "cropdone") { renderPhoto(); dlg.querySelector("#mkCrop").hidden = true; }
    if (a === "noface") { layout.img = ""; paintStyle(); }
    if (a === "nophoto") { photo = ""; photoSrc = ""; src = null; if (back.style === "photo") back.style = "white"; paintPhoto(); paintPreview(); }
    if (["share", "email", "sms", "copy", "copyedit", "mailedit", "zip", "sig", "copysig"].indexOf(a) >= 0) act(a);
  }

  window.CardMaker = { open: open, manage: manage, ready: ready, theirs: theirs, recall: recall, _parse: { fromText: fromText, fromQr: fromQr, fromPaste: fromPaste, social: social, blank: blank, vcard: vcard, decode: decode, linkFor: linkFor, signature: signature } };
})();
