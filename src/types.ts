// ─── انواع داده‌های برنامه ───────────────────────────────────────────────

/** نوع نشانگر روی نقشه (فقط سبز) */
export type MarkerKind = "green";

/** ساختار هر مکان (همان ساختار فایل public/data/places.json) */
export interface Place {
  /** شناسه یکتا */
  id: string;
  name: string;
  nameEn?: string;
  /** رنگ نشانگر: سبز */
  kind: MarkerKind;
  lat: number;
  lng: number;
  /** توضیح کوتاه (یک خط) */
  short: string;
  /** توضیح کامل */
  description: string;
  address?: string;
  phone?: string;
  hours?: string;
  website?: string;
  /**
   * تصاویر:
   *  - لینک اینترنتی (https://…)
   *  - مسیر نسبی داخل سایت (data/images/xxx.jpg)
   *  - پیش‌نویس مدیر: pending:<id> (هنوز منتشر نشده)
   */
  images: string[];
}

export type LayerKey = "google" | "satellite" | "hybrid" | "terrain" | "osm";

/** هدف پرواز دوربین نقشه */
export interface FlyTarget {
  lat: number;
  lng: number;
  zoom?: number;
  /** جابه‌جایی مرکز برای جا دادن پنل پایین */
  offset?: boolean;
  nonce: number;
}

/** رویداد نصب PWA (Chrome) */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// ─── بخش مدیریت ──────────────────────────────────────────────────────────

export interface EncryptedBlob {
  iv: string;
  data: string;
}

export interface GitHubLink {
  /** owner/repo */
  repo: string;
  branch: string;
}

/** فایل public/data/admin.json — حساب مدیر (رمز به‌صورت هش ذخیره می‌شود) */
export interface AdminConfig {
  version: 1;
  username: string;
  salt: string;
  iterations: number;
  /** هش رمز عبور (PBKDF2) */
  verifier: string;
  /** هش پشتیبان برای دستگاه‌هایی که WebCrypto ندارند (مثل برخی WebViewهای قدیمی اندروید) */
  fbVerifier?: string;
  /** هنوز رمز پیش‌فرض است؟ */
  isDefault: boolean;
  updatedAt?: string;
  /** اتصال به GitHub برای انتشار (توکن با رمز مدیر رمزنگاری شده) */
  github: (GitHubLink & { token: EncryptedBlob }) | null;
}

/** نشست مدیر پس از ورود */
export interface AdminSession {
  username: string;
  isDefault: boolean;
  remember: boolean;
  /** اگر اتصال GitHub فعال باشد، توکن بازشده */
  github: (GitHubLink & { token: string }) | null;
}

/** تصویری که مدیر انتخاب کرده ولی هنوز منتشر نشده */
export interface PendingImage {
  id: string;
  /** JPEG فشرده‌شده به‌صورت data URL */
  dataUrl: string;
  /** نام فایل مقصد در data/images/ */
  fileName: string;
}

/** تغییرات منتشرنشده مدیر */
export interface Draft {
  places: Place[];
  pending: PendingImage[];
  updatedAt: number;
}

export interface AdminPrefs {
  /** با هر انتشار محتوا، APK جدید هم ساخته شود؟ */
  rebuildAndroid: boolean;
}

export interface EditorState {
  place: Place;
  pending: PendingImage[];
  isNew: boolean;
}

/** درخواست انتخاب موقعیت روی نقشه */
export type PickRequest = { kind: "new" } | { kind: "move"; id: string } | { kind: "editor" };
