/* adambacch.us/card offline: the page and its files are kept as they're used, so the card (and its QR codes) still opens
   with no signal, e.g. at an event. Pages: network first, falling back to the copy; files: the copy first, refreshed behind. */
var CACHE = "card-v5";
var CORE = ["./", "card.css?v=20261029d", "qrs.js?v=20261029d", "card.js?v=20261029d", "img/card-front.webp", "img/card-back.webp", "img/card-front.jpg", "img/card-back.jpg", "/adam-bacchus.vcf"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).catch(function () {}).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return; // libraries from CDNs and the metrics beacon go straight to the network
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(function (r) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put("./", copy); }); return r; })
      .catch(function () { return caches.match("./"); }));
    return;
  }
  e.respondWith(caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (r) { if (r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); } return r; });
    return hit || net;
  }));
});
