import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdminSession, Draft, PendingImage, Place } from "../types";
import {
  fetchLatestCloudPlaces,
  publishPlacesToCloud,
  subscribeToLiveCloudUpdates,
} from "../lib/cloudSync";
import { getRawFile } from "../lib/github";
import {
  REPO_DATA_PATH,
  countChanges,
  isPendingRef,
  loadPublishedPlaces,
  localBase,
  pendingIdOf,
  publishDraft,
  remoteBase,
  resolvePlaces,
  sanitizePlaces,
} from "../lib/placesStore";
import { KEYS, kvDel, kvGet, kvSet, readJSON, writeJSON } from "../lib/storage";

interface Published {
  raw: Place[];
  base: string;
  pending?: PendingImage[];
  updatedAt?: number;
}

/** حذف تصاویر منتشرنشده‌ای که دیگر هیچ مکانی به آن‌ها اشاره نمی‌کند */
function prunePending(pending: PendingImage[], places: Place[]): PendingImage[] {
  const used = new Set<string>();
  for (const p of places) for (const s of p.images) if (isPendingRef(s)) used.add(pendingIdOf(s));
  return pending.filter((pi) => used.has(pi.id));
}

/**
 * مدیریت آنلاین داده مکان‌ها:
 *  - publishedPlaces: مکان‌های منتشرشده آنلاین (نمای کاربران؛ تا قبل از «تأیید و انتشار نهایی» تغییر نمی‌کند)
 *  - places: مکان‌های در حال کار مدیر (شامل تغییرات ذخیره‌شده در پیش‌نویس قبل از انتشار نهایی)
 */
export function usePlaces(session: AdminSession | null) {
  const gh = session?.github ?? null;
  const [published, setPublished] = useState<Published | null>(() =>
    readJSON<Published | null>(KEYS.cache, null)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftVolatile, setDraftVolatile] = useState(false);
  const draftRef = useRef<Draft | null>(null);

  const applyPublished = useCallback((p: Published) => {
    setPublished(p);
    writeJSON(KEYS.cache, p);
    void kvSet(KEYS.cache, p);
  }, []);

  // ── بارگذاری کش محلی و پیش‌نویس مدیر هنگام شروع
  useEffect(() => {
    let cancelled = false;
    kvGet<Published>(KEYS.cache).then((cachedPub) => {
      if (!cancelled && cachedPub && Array.isArray(cachedPub.raw) && cachedPub.raw.length > 0) {
        setPublished((prev) => prev ?? cachedPub);
      }
    });
    kvGet<Draft>(KEYS.draft)
      .then((d) => {
        if (cancelled) return;
        draftRef.current = d ?? null;
        setDraft(d ?? null);
      })
      .finally(() => !cancelled && setDraftReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // ── دریافت آخرین نسخه منتشرشده از سرور ابری آنلاین (و نسخه اولیه به‌عنوان پشتیبان)
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    let cloudResolved = false;

    // ۱) تلاش برای دریافت آخرین نسخه منتشرشده از سرور ابری آنلاین
    const cloudPromise = fetchLatestCloudPlaces()
      .then((cloudPlaces) => {
        if (cloudPlaces && cloudPlaces.length > 0) {
          cloudResolved = true;
          applyPublished({
            raw: cloudPlaces,
            base: remoteBase() ?? localBase(),
            pending: [],
            updatedAt: Date.now(),
          });
          return true;
        }
        return false;
      })
      .catch(() => false);

    // ۲) بارگذاری فایل پیش‌فرض برای نمایش سریع اولیه تا زمان رسیدن پاسخ ابری
    const localPromise = loadPublishedPlaces((r) => {
      if (!cloudResolved) {
        setPublished((prev) => {
          if (prev && prev.raw.length > 0) return prev;
          return { raw: r.raw, base: r.base };
        });
      }
    });

    const [cloudOk, localOk] = await Promise.all([cloudPromise, localPromise]);
    if (!cloudOk && !localOk) {
      const cached = await kvGet<Published>(KEYS.cache);
      if (!cached || !cached.raw.length) {
        setError("دریافت اطلاعات مکان‌ها ممکن نشد");
      }
    }
    setLoading(false);
  }, [applyPublished]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // ── اشتراک زنده (Real-time) برای دریافت آنی انتشارهای جدید مدیر روی همه دستگاه‌ها
  useEffect(() => {
    const unsubscribe = subscribeToLiveCloudUpdates((newPlaces) => {
      applyPublished({
        raw: newPlaces,
        base: remoteBase() ?? localBase(),
        pending: [],
        updatedAt: Date.now(),
      });
    });
    return unsubscribe;
  }, [applyPublished]);

  // ── همگام‌سازی پشت‌صحنه در صورت وجود اتصال گیت‌هاب
  useEffect(() => {
    if (!gh) return;
    let cancelled = false;
    getRawFile(gh.token, gh.repo, REPO_DATA_PATH, gh.branch)
      .then((txt) => {
        if (cancelled) return;
        applyPublished({ raw: sanitizePlaces(JSON.parse(txt)), base: remoteBase() ?? localBase() });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [gh, applyPublished]);

  // ── ذخیره پیش‌نویس مدیر (بدون انتشار نهایی)
  const persistDraft = useCallback((d: Draft | null) => {
    draftRef.current = d;
    setDraft(d);
    if (!d) {
      void kvDel(KEYS.draft);
      setDraftVolatile(false);
      return;
    }
    void kvSet(KEYS.draft, d).then((ok) => setDraftVolatile(!ok));
  }, []);

  const ensureDraft = useCallback(
    (): Draft =>
      draftRef.current ?? {
        places: published?.raw ?? [],
        pending: published?.pending ?? [],
        updatedAt: Date.now(),
      },
    [published]
  );

  const upsertPlace = useCallback(
    (place: Place, newImages: PendingImage[]) => {
      const d = ensureDraft();
      const exists = d.places.some((p) => p.id === place.id);
      const places = exists ? d.places.map((p) => (p.id === place.id ? place : p)) : [...d.places, place];
      persistDraft({
        places,
        pending: prunePending([...d.pending, ...newImages], places),
        updatedAt: Date.now(),
      });
    },
    [ensureDraft, persistDraft]
  );

  const removePlace = useCallback(
    (id: string) => {
      const d = ensureDraft();
      const places = d.places.filter((p) => p.id !== id);
      persistDraft({ places, pending: prunePending(d.pending, places), updatedAt: Date.now() });
    },
    [ensureDraft, persistDraft]
  );

  const movePlace = useCallback(
    (id: string, lat: number, lng: number) => {
      const d = ensureDraft();
      persistDraft({
        ...d,
        places: d.places.map((p) => (p.id === id ? { ...p, lat, lng } : p)),
        updatedAt: Date.now(),
      });
    },
    [ensureDraft, persistDraft]
  );

  const discardDraft = useCallback(() => persistDraft(null), [persistDraft]);

  /**
   * انتشار نهایی تغییرات روی فضای ابری آنلاین:
   * - تصاویر جدید داخل داده‌های مکان نهایی می‌شوند
   * - لیست جدید روی سرور ابری آنلاین منتشر می‌شود تا تمام کاربران روی هر دستگاهی فوراً ببینند
   * - اگر اتصال گیت‌هاب پشت‌صحنه هم وجود داشته باشد، در پس‌زمینه همگام‌سازی می‌شود
   */
  const publish = useCallback(
    async (opts?: { rebuildAndroid?: boolean }) => {
      const d = draftRef.current;
      if (!d) return;

      const base = published?.base ?? localBase();

      // نهایی‌سازی تصاویر و مکان‌ها برای انتشار آنلاین
      const finalizedPlaces: Place[] = d.places.map((p) => ({
        ...p,
        kind: "green" as const,
        images: p.images
          .map((src) => {
            if (!isPendingRef(src)) {
              if (/^(https?:|data:|blob:)/i.test(src)) return src;
              try {
                return new URL(src, base).href;
              } catch {
                return src;
              }
            }
            const found = d.pending.find((pi) => pi.id === pendingIdOf(src));
            return found?.dataUrl ?? "";
          })
          .filter(Boolean),
      }));

      // ۱) انتشار در سرور ابری آنلاین (مشترک بین تمام کاربران و دستگاه‌ها)
      await publishPlacesToCloud(finalizedPlaces);

      // ۲) اگر اتصال پشت‌صحنه گیت‌هاب نیز برقرار باشد، در پس‌زمینه ارسال شود
      if (gh) {
        publishDraft(gh, d, {
          rebuildAndroid: opts?.rebuildAndroid ?? false,
          by: session?.username ?? "admin",
        }).catch(() => undefined);
      }

      applyPublished({
        raw: finalizedPlaces,
        base: remoteBase() ?? localBase(),
        pending: [],
        updatedAt: Date.now(),
      });
      persistDraft(null);
    },
    [gh, session?.username, published?.base, applyPublished, persistDraft]
  );

  // ── خروجی‌ها
  const base = published?.base ?? localBase();

  // مکان‌های منتشرشده نهایی (برای نمای کاربر — تا قبل از «تأیید و انتشار نهایی» تغییر نمی‌کند)
  const publishedPlaces = useMemo(
    () => resolvePlaces(published?.raw ?? [], base, published?.pending),
    [published, base]
  );

  // مکان‌های پنل مدیریت (شامل تغییرات ذخیره‌شده در پیش‌نویس)
  const rawPlaces = draft ? draft.places : (published?.raw ?? []);
  const places = useMemo(
    () => resolvePlaces(rawPlaces, base, draft?.pending ?? published?.pending),
    [rawPlaces, base, draft?.pending, published?.pending]
  );

  const changeCount = useMemo(
    () => (draft ? countChanges(draft.places, published?.raw ?? []) : 0),
    [draft, published]
  );

  const resolveImage = useCallback(
    (src: string) =>
      resolvePlaces([{ images: [src] } as Place], base, draft?.pending ?? published?.pending)[0]
        .images[0] ?? "",
    [base, draft?.pending, published?.pending]
  );

  /** وارد کردن لیست مکان‌ها از فایل JSON (در پیش‌نویس ذخیره می‌شود تا پس از تأیید منتشر شود) */
  const importPlaces = useCallback(
    (jsonText: string): number => {
      const parsed = sanitizePlaces(JSON.parse(jsonText));
      if (parsed.length === 0) throw new Error("هیچ مکان معتبری در این فایل پیدا نشد");
      persistDraft({ places: parsed, pending: [], updatedAt: Date.now() });
      return parsed.length;
    },
    [persistDraft]
  );

  return {
    places,
    publishedPlaces,
    rawPlaces,
    loading,
    error,
    reload,
    draftReady,
    hasDraft: draft !== null,
    changeCount,
    draftVolatile,
    canPublish: true,
    upsertPlace,
    removePlace,
    movePlace,
    discardDraft,
    publish,
    resolveImage,
    importPlaces,
    pendingImages: draft?.pending ?? [],
  };
}

export type PlacesApi = ReturnType<typeof usePlaces>;
