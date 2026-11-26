/* First-party visit metrics (no cookies). Posts to /api/hit on browsea.surf; read by the Jobsearch Metrics window.
   window.bm(name, value) records a named event (card, clip, island, resume, email...). The same file is copied to
   adambacch.us, where ENDPOINT points at browsea.surf. A ?src= tag (resume, linkedin, apply...) is kept for the
   session and removed from the address bar so it isn't passed on when the link is shared. */
(function () {
  "use strict";
  var ENDPOINT = location.hostname === "adambacch.us" || location.hostname === "www.adambacch.us"
    ? "https://browsea.surf/api/hit" : "/api/hit";
  if (!navigator.sendBeacon || /^(127\.0\.0\.1|localhost)$/.test(location.hostname) && !/[?&]metrics/.test(location.search)) {
    window.bm = function () {};
    return;
  }
  var ss = {};
  try { ss = window.sessionStorage; } catch (e) {}
  function sget(k) { try { return ss.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { ss.setItem(k, v); } catch (e) {} }
  var sid = sget("bm.sid");
  if (!sid) { sid = Math.random().toString(36).slice(2, 12); sset("bm.sid", sid); }
  var params = new URLSearchParams(location.search);
  var src = params.get("src");
  if (src) {
    sset("bm.src", src);
    params.delete("src");
    var q = params.toString();
    try { history.replaceState(history.state, "", location.pathname + (q ? "?" + q : "") + location.hash); } catch (e) {}
  } else src = sget("bm.src") || "";

  var queue = [], timer = null;
  function flush() {
    if (!queue.length) return;
    var body = JSON.stringify({ sid: sid, src: src, path: location.pathname, ref: document.referrer, events: queue.splice(0) });
    try { navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "text/plain" })); } catch (e) {}
  }
  function push(e) { queue.push(e); clearTimeout(timer); timer = setTimeout(flush, 1500); }
  window.bm = function (name, val) { push({ t: "event", n: String(name), val: val == null ? "" : String(val) }); };

  push({ t: "view" });

  // Contact actions are tracked from the links themselves, so pages don't need their own calls.
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (/^mailto:/i.test(href)) window.bm("email");
    else if (/\.pdf($|[?#])/i.test(href)) window.bm("resume", a.hasAttribute("download") ? "download" : "open");
    else if (/\.vcf($|[?#])/i.test(href)) window.bm("vcard");
    else if (/^https?:/i.test(href) && a.hostname !== location.hostname) window.bm("out", a.hostname.replace(/^www\./, ""));
  }, true);

  // Engaged time (only while the tab is visible) and deepest scroll, reported when the visitor leaves or hides the tab.
  var active = 0, since = document.visibilityState === "visible" ? Date.now() : 0, maxScroll = 0, left = false;
  function scrollPct() {
    var h = document.documentElement.scrollHeight - innerHeight;
    return h > 0 ? Math.round(100 * scrollY / h) : 100;
  }
  addEventListener("scroll", function () { var p = scrollPct(); if (p > maxScroll) maxScroll = p; }, { passive: true });
  function leave() {
    if (since) { active += Date.now() - since; since = 0; }
    if (left && active < 1000) return;
    left = true;
    queue.push({ t: "leave", secs: active / 1000, scroll: maxScroll });
    active = 0;
    flush();
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") leave();
    else since = Date.now();
  });
  addEventListener("pagehide", leave);
})();
