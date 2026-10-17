/** کلیدهای ذخیره‌سازی محلی */
export const KEYS = {
  session: "tm.admin.session",
  draft: "tm.admin.draft",
  prefs: "tm.admin.prefs",
  adminConfig: "tm.admin.config",
  cache: "tm.places.cache",
} as const;

export function readJSON<T>(key: string, fallback: T, store: Storage = localStorage): T {
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** true اگر ذخیره موفق بود */
export function writeJSON(key: string, value: unknown, store: Storage = localStorage): boolean {
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string) {
  try {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** شناسه کوتاه یکتا */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── IndexedDB (برای پیش‌نویس با تصاویر؛ حجم بیشتر از localStorage) ───────

const DB_NAME = "tabriz-map";
const STORE = "kv";
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB unavailable"));
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const r = fn(t.objectStore(STORE));
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      })
  );
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  try {
    const v = await tx<T>("readonly", (s) => s.get(key));
    if (v !== undefined) return v;
  } catch {
    /* fall back */
  }
  return readJSON<T | undefined>(key, undefined);
}

/** true اگر ذخیره موفق بود */
export async function kvSet(key: string, value: unknown): Promise<boolean> {
  try {
    await tx("readwrite", (s) => s.put(value, key));
    removeKey(key);
    return true;
  } catch {
    return writeJSON(key, value);
  }
}

export async function kvDel(key: string): Promise<void> {
  try {
    await tx("readwrite", (s) => s.delete(key));
  } catch {
    /* ignore */
  }
  removeKey(key);
}
