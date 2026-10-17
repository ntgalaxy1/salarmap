/* Service Worker نقشه تبریز
 * - پوسته برنامه (index.html، آیکون‌ها، تصاویر) را کش می‌کند تا برنامه قابل نصب باشد و آفلاین باز شود
 * - data/places.json: همیشه اول شبکه (تا تغییرات مدیر فوراً دیده شود)؛ اگر آفلاین بود، آخرین نسخه کش‌شده
 * - کاشی‌های نقشه و درخواست‌های خارجی (GitHub API و…) کش نمی‌شوند
 */
const CACHE = "tabriz-map-v2";
const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.allSettled(APP_SHELL.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // فقط فایل‌های خود برنامه

  // صفحه اصلی: شبکه اول، سپس کش
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // داده نقاط: شبکه اول (بدون پارامتر کش‌شکن در کلید کش)
  if (url.pathname.endsWith("/data/places.json")) {
    const key = new Request(url.origin + url.pathname);
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(key, copy));
          }
          return res;
        })
        .catch(() => caches.match(key).then((hit) => hit || Response.error()))
    );
    return;
  }

  // بقیه فایل‌ها: کش اول، به‌روزرسانی در پس‌زمینه
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
