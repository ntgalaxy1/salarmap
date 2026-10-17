import { BUILD_INFO } from "../buildInfo";

/** ریشه همین نسخه از برنامه (وب: همان سایت — اندروید: فایل‌های داخل APK) */
export function localBase(): string {
  return new URL(import.meta.env.BASE_URL || "./", window.location.href).href;
}

/** ریشه نسخه منتشرشده روی GitHub Pages (در بیلد CI مشخص می‌شود) */
export function remoteBase(): string | null {
  if (!BUILD_INFO.pagesUrl) return null;
  try {
    return new URL(BUILD_INFO.pagesUrl).href;
  } catch {
    return null;
  }
}

/** آدرس فایل با پارامتر کش‌شکن */
export function bust(base: string, path: string): string {
  const u = new URL(path, base);
  u.searchParams.set("t", String(Date.now()));
  return u.href;
}
