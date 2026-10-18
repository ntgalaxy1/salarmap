/**
 * مخزن داده مکان‌ها
 *  - کاربران: خواندن public/data/places.json از نسخه منتشرشده (GitHub Pages) یا نسخه همراه برنامه
 *  - مدیر: پیش‌نویس روی دستگاه + انتشار در مخزن GitHub (یک Commit برای همه فایل‌ها)
 */
import type { Draft, GitHubLink, PendingImage, Place } from "../types";
import { commitFiles, utf8ToBase64, type CommitFile } from "./github";
import { dataUrlToBase64 } from "./image";
import { bust, localBase, remoteBase } from "./urls";

export const DATA_PATH = "data/places.json";
export const IMAGES_DIR = "data/images";
/** مسیر فایل داده داخل مخزن */
export const REPO_DATA_PATH = `public/${DATA_PATH}`;

export { localBase, remoteBase };

// ─── تصاویر ───────────────────────────────────────────────────────────────

const PENDING_PREFIX = "pending:";
export const pendingRef = (id: string) => `${PENDING_PREFIX}${id}`;
export const isPendingRef = (src: string) => src.startsWith(PENDING_PREFIX);
export const pendingIdOf = (src: string) => src.slice(PENDING_PREFIX.length);

/** تبدیل آدرس تصویر (نسبی / اینترنتی / منتشرنشده) به آدرس قابل نمایش */
export function resolveImageUrl(src: string, base: string, pending?: PendingImage[]): string {
  if (isPendingRef(src)) {
    return pending?.find((p) => p.id === pendingIdOf(src))?.dataUrl ?? "";
  }
  if (/^(https?:|data:|blob:)/i.test(src)) return src;
  try {
    return new URL(src, base).href;
  } catch {
    return src;
  }
}

export function resolvePlaces(places: Place[], base: string, pending?: PendingImage[]): Place[] {
  return places.map((p) => ({
    ...p,
    images: (p.images ?? []).map((s) => resolveImageUrl(s, base, pending)).filter(Boolean),
  }));
}

// ─── اعتبارسنجی داده ورودی ────────────────────────────────────────────────

const optStr = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);

export function sanitizePlaces(input: unknown): Place[] {
  if (!Array.isArray(input)) return [];
  const out: Place[] = [];
  const seen = new Set<string>();
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    let id = String(p.id ?? "").trim() || `p-${out.length + 1}`;
    while (seen.has(id)) id += "-2";
    seen.add(id);
    const place: Place = {
      id,
      name: String(p.name ?? "بدون نام"),
      kind: "green",
      lat,
      lng,
      short: String(p.short ?? ""),
      description: String(p.description ?? ""),
      images: Array.isArray(p.images)
        ? p.images.filter((s): s is string => typeof s === "string" && s.trim() !== "")
        : [],
    };
    const nameEn = optStr(p.nameEn);
    const address = optStr(p.address);
    const phone = optStr(p.phone);
    const hours = optStr(p.hours);
    const website = optStr(p.website);
    if (nameEn) place.nameEn = nameEn;
    if (address) place.address = address;
    if (phone) place.phone = phone;
    if (hours) place.hours = hours;
    if (website) place.website = website;
    out.push(place);
  }
  return out;
}

// ─── بارگذاری نسخه منتشرشده ───────────────────────────────────────────────

export interface LoadResult {
  raw: Place[];
  base: string;
  source: "remote" | "local";
}

async function fetchPlaces(base: string, timeoutMs = 12000): Promise<Place[]> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(bust(base, DATA_PATH), { cache: "no-store", signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return sanitizePlaces(await res.json());
  } finally {
    clearTimeout(timer);
  }
}

/**
 * نسخه محلی و نسخه منتشرشده هم‌زمان خوانده می‌شوند؛
 * هر کدام زودتر رسید نمایش داده می‌شود و نسخه منتشرشده (تازه‌تر) اولویت دارد.
 */
export async function loadPublishedPlaces(onResult: (r: LoadResult) => void): Promise<boolean> {
  const local = localBase();
  const remote = remoteBase();
  let remoteDone = false;
  let ok = false;
  const tasks: Promise<void>[] = [];

  if (remote && remote !== local) {
    tasks.push(
      fetchPlaces(remote)
        .then((raw) => {
          remoteDone = true;
          ok = true;
          onResult({ raw, base: remote, source: "remote" });
        })
        .catch(() => undefined)
    );
  }
  tasks.push(
    fetchPlaces(local)
      .then((raw) => {
        ok = true;
        if (!remoteDone) onResult({ raw, base: local, source: "local" });
      })
      .catch(() => undefined)
  );

  await Promise.all(tasks);
  return ok;
}

// ─── انتشار پیش‌نویس مدیر ─────────────────────────────────────────────────

/** تعداد مکان‌های اضافه/حذف/ویرایش‌شده نسبت به نسخه منتشرشده */
export function countChanges(draft: Place[], published: Place[]): number {
  const pub = new Map(published.map((p) => [p.id, JSON.stringify(p)]));
  let n = 0;
  const seen = new Set<string>();
  for (const p of draft) {
    seen.add(p.id);
    const before = pub.get(p.id);
    if (before === undefined || before !== JSON.stringify(p)) n++;
  }
  for (const id of pub.keys()) if (!seen.has(id)) n++;
  return n;
}

/** پیش‌نویس → فایل‌های نهایی (تصاویر منتشرنشده به فایل تبدیل می‌شوند) */
export function materializeDraft(draft: Draft): { raw: Place[]; files: CommitFile[] } {
  const used = new Set<string>();
  const raw: Place[] = draft.places.map((p) => ({
    ...p,
    images: p.images
      .map((s) => {
        if (!isPendingRef(s)) return s;
        const pi = draft.pending.find((x) => x.id === pendingIdOf(s));
        if (!pi) return "";
        used.add(pi.id);
        return `${IMAGES_DIR}/${pi.fileName}`;
      })
      .filter(Boolean),
  }));

  const files: CommitFile[] = draft.pending
    .filter((pi) => used.has(pi.id))
    .map((pi) => ({
      path: `public/${IMAGES_DIR}/${pi.fileName}`,
      content: dataUrlToBase64(pi.dataUrl),
      encoding: "base64" as const,
    }));

  files.push({
    path: REPO_DATA_PATH,
    content: utf8ToBase64(JSON.stringify(raw, null, 2) + "\n"),
    encoding: "base64",
  });
  return { raw, files };
}

export async function publishDraft(
  gh: GitHubLink & { token: string },
  draft: Draft,
  opts: { rebuildAndroid: boolean; by: string }
): Promise<{ raw: Place[]; sha: string }> {
  const { raw, files } = materializeDraft(draft);
  const imgCount = files.length - 1;
  const message =
    `content: به‌روزرسانی مکان‌ها (${raw.length} مکان` +
    (imgCount ? `، ${imgCount} تصویر جدید` : "") +
    `) — توسط ${opts.by}` +
    (opts.rebuildAndroid ? "" : " [skip android]");
  const sha = await commitFiles(gh.token, gh.repo, gh.branch, files, message);
  return { raw, sha };
}
