/**
 * همگام‌سازی ابری آنی و خودکار (Online Cloud Sync) برای «سالار مپ»
 *
 * بدون نیاز به هیچ‌گونه تنظیم فنی یا GitHub توسط مدیر:
 *  - وقتی مدیر روی «تأیید و انتشار نهایی» می‌زند، آخرین لیست مکان‌ها و تصاویر در سرور ابری ذخیره می‌شود.
 *  - تمام کاربران (روی هر گوشی یا مرورگر دیگری) به‌محض باز کردن برنامه — و حتی به‌صورت زنده در حین باز بودن برنامه —
 *    آخرین تغییرات منتشرشده توسط مدیر را می‌بینند.
 */
import type { AdminConfig, Place } from "../types";
import { sanitizePlaces } from "./placesStore";

/** اعتبارسنجی ساختار تنظیمات مدیر (بدون import از adminConfig برای جلوگیری از وابستگی حلقه‌ای) */
function isValidAdminConfig(c: unknown): c is AdminConfig {
  if (!c || typeof c !== "object") return false;
  const o = c as Record<string, unknown>;
  return (
    typeof o.username === "string" &&
    typeof o.salt === "string" &&
    typeof o.verifier === "string" &&
    typeof o.iterations === "number"
  );
}

const KV_APP_KEY = "x5fie8bq";
const KV_POINTER_KEY = "salarmap_live_v1";
const KV_ADMIN_POINTER_KEY = "salarmap_admin_v1";
const NTFY_TOPIC = "salarmap_tabriz_live_v1";
const NTFY_ADMIN_TOPIC = "salarmap_admin_live_v1";
const BYTEBIN_POST = "https://bytebin.lucko.me/post";
const BYTEBIN_GET = "https://bytebin.lucko.me/";

let lastLoadedBlobKey: string | null = null;

/** خواندن کلید آخرین نسخه منتشرشده از سرور اشاره‌گر */
async function getLatestPointerKey(): Promise<string | null> {
  // ۱) سرور اصلی اشاره‌گر (keyvalue)
  try {
    const res = await fetch(
      `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_APP_KEY}/${KV_POINTER_KEY}?t=${Date.now()}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const text = (await res.text()).trim().replace(/^"+|"+$/g, "");
      if (text && text !== "null" && /^[A-Za-z0-9_-]{5,}$/.test(text)) {
        return text;
      }
    }
  } catch {
    /* ادامه به سرور پشتیبان */
  }

  // ۲) سرور پشتیبان (ntfy)
  try {
    const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}/json?poll=1&since=72h`, {
      cache: "no-store",
    });
    if (res.ok) {
      const lines = (await res.text()).trim().split("\n").filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const item = JSON.parse(lines[i]) as { event?: string; message?: string };
          if (item.event === "message" && item.message && /^[A-Za-z0-9_-]{5,}$/.test(item.message.trim())) {
            return item.message.trim();
          }
        } catch {
          /* ignore line */
        }
      }
    }
  } catch {
    /* ignore */
  }

  return null;
}

/** دریافت داده مکان‌ها از روی کلید ابری */
export async function fetchPlacesByBlobKey(blobKey: string): Promise<Place[] | null> {
  try {
    const res = await fetch(`${BYTEBIN_GET}${encodeURIComponent(blobKey)}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const list = Array.isArray(data)
      ? data
      : data && typeof data === "object" && Array.isArray((data as { places?: unknown }).places)
        ? (data as { places: unknown[] }).places
        : null;
    if (!list) return null;
    const sanitized = sanitizePlaces(list);
    lastLoadedBlobKey = blobKey;
    return sanitized;
  } catch {
    return null;
  }
}

/** دریافت آخرین مکان‌های منتشرشده از فضای ابری آنلاین */
export async function fetchLatestCloudPlaces(): Promise<Place[] | null> {
  const key = await getLatestPointerKey();
  if (!key) return null;
  return fetchPlacesByBlobKey(key);
}

/** انتشار نهایی مکان‌ها روی فضای ابری آنلاین تا همه کاربران فوراً ببینند */
export async function publishPlacesToCloud(places: Place[]): Promise<string> {
  const payload = JSON.stringify({
    version: 1,
    updatedAt: new Date().toISOString(),
    places,
  });

  const postRes = await fetch(BYTEBIN_POST, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });

  if (!postRes.ok) {
    throw new Error("خطا در اتصال به سرور ابری؛ اینترنت خود را بررسی کنید");
  }

  const { key } = (await postRes.json()) as { key?: string };
  if (!key) throw new Error("پاسخ نامعتبر از سرور ابری");

  lastLoadedBlobKey = key;

  // به‌روزرسانی هم‌زمان اشاره‌گر اصلی و کانال اعلان آنی
  await Promise.allSettled([
    fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${KV_APP_KEY}/${KV_POINTER_KEY}/${key}`, {
      method: "POST",
      body: "",
    }),
    fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: "POST",
      body: key,
    }),
  ]);

  return key;
}

/** اشتراک زنده (Real-time) برای دریافت آنی تغییرات مدیر در صفحه کاربران بدون نیاز به رفرش */
export function subscribeToLiveCloudUpdates(onNewPlaces: (places: Place[]) => void): () => void {
  let closed = false;
  let es: EventSource | null = null;

  const handleKey = async (key: string) => {
    const clean = key.trim();
    if (closed || !clean || clean === lastLoadedBlobKey || !/^[A-Za-z0-9_-]{5,}$/.test(clean)) return;
    const places = await fetchPlacesByBlobKey(clean);
    if (!closed && places) {
      onNewPlaces(places);
    }
  };

  if (typeof EventSource !== "undefined") {
    try {
      es = new EventSource(`https://ntfy.sh/${NTFY_TOPIC}/sse`);
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as { event?: string; message?: string };
          if (data.event === "message" && data.message) {
            void handleKey(data.message);
          }
        } catch {
          /* ignore */
        }
      };
    } catch {
      /* fallback to polling */
    }
  }

  // بررسی دوره‌ای هر ۲۵ ثانیه برای اطمینان کامل
  const timer = window.setInterval(async () => {
    if (closed || document.hidden) return;
    const key = await getLatestPointerKey();
    if (key && key !== lastLoadedBlobKey) {
      await handleKey(key);
    }
  }, 25000);

  return () => {
    closed = true;
    window.clearInterval(timer);
    if (es) es.close();
  };
}

// ─── ذخیره و بازیابی ابری تنظیمات حساب مدیر ─────────────────────────────────

/** خواندن کلید اشاره‌گر تنظیمات مدیر از سرور (اصلی و پشتیبان) */
async function getAdminPointerKey(): Promise<string | null> {
  try {
    const res = await fetch(
      `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_APP_KEY}/${KV_ADMIN_POINTER_KEY}?t=${Date.now()}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const text = (await res.text()).trim().replace(/^"+|"+$/g, "");
      if (text && text !== "null" && /^[A-Za-z0-9_-]{5,}$/.test(text)) return text;
    }
  } catch {
    /* ادامه به پشتیبان */
  }

  try {
    const res = await fetch(`https://ntfy.sh/${NTFY_ADMIN_TOPIC}/json?poll=1&since=168h`, {
      cache: "no-store",
    });
    if (res.ok) {
      const lines = (await res.text()).trim().split("\n").filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const item = JSON.parse(lines[i]) as { event?: string; message?: string };
          if (item.event === "message" && item.message && /^[A-Za-z0-9_-]{5,}$/.test(item.message.trim())) {
            return item.message.trim();
          }
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }

  return null;
}

/**
 * دریافت آخرین تنظیمات حساب مدیر از فضای ابری آنلاین
 * (برای اینکه تغییر رمز مدیر هرگز — حتی با نصب مجدد APK یا پاک شدن داده‌ها — از بین نرود)
 */
export async function fetchAdminConfigFromCloud(): Promise<AdminConfig | null> {
  const key = await getAdminPointerKey();
  if (!key) return null;
  try {
    const res = await fetch(`${BYTEBIN_GET}${encodeURIComponent(key)}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const cfg =
      data && typeof data === "object" && !Array.isArray(data)
        ? (data as { admin?: unknown }).admin ?? data
        : null;
    return isValidAdminConfig(cfg) ? (cfg as AdminConfig) : null;
  } catch {
    return null;
  }
}

/** ذخیره تنظیمات حساب مدیر روی فضای ابری آنلاین */
export async function publishAdminConfigToCloud(config: AdminConfig): Promise<void> {
  try {
    const postRes = await fetch(BYTEBIN_POST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin: config }),
    });
    if (!postRes.ok) return;
    const { key } = (await postRes.json()) as { key?: string };
    if (!key) return;

    await Promise.allSettled([
      fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${KV_APP_KEY}/${KV_ADMIN_POINTER_KEY}/${key}`, {
        method: "POST",
        body: "",
      }),
      fetch(`https://ntfy.sh/${NTFY_ADMIN_TOPIC}`, {
        method: "POST",
        body: key,
      }),
    ]);
  } catch {
    /* ذخیرهٔ ابری اختیاری است؛ ذخیرهٔ محلی کافی است */
  }
}
