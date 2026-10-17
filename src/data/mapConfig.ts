import type { LayerKey, MarkerKind } from "../types";

// ─── تنظیمات نقشه تبریز ──────────────────────────────────────────────────

/** مرکز شهر تبریز (هنگام باز شدن برنامه، نقشه روی این نقطه و با این زوم باز می‌شود) */
export const TABRIZ_CENTER: [number, number] = [38.0742, 46.298];
export const DEFAULT_ZOOM = 13;

/** محدوده پیشنهادی تبریز (فقط برای ارجاع؛ نقشه قفل نیست و کل گوگل‌مپ آزاد است) */
export const TABRIZ_BOUNDS: [[number, number], [number, number]] = [
  [37.9, 46.0], // جنوب غربی
  [38.26, 46.6], // شمال شرقی
];

export interface LayerDef {
  name: string;
  desc: string;
  url: string;
  subdomains: string[];
  attribution: string;
  preview: string;
  maxZoom?: number;
}

/**
 * لایه‌های کامل نقشه گوگل + OpenStreetMap
 * تمام لایه‌های گوگل مستقیم از سرور کاشی گوگل با زبان فارسی (hl=fa) و بدون محدودیت جغرافیایی خوانده می‌شوند.
 */
export const LAYERS: Record<LayerKey, LayerDef> = {
  google: {
    name: "گوگل مپ (خیابانی)",
    desc: "نقشه کامل گوگل با جزئیات خیابان‌ها و مکان‌ها",
    url: "https://mt{s}.google.com/vt/lyrs=m&hl=fa&x={x}&y={y}&z={z}",
    subdomains: ["0", "1", "2", "3"],
    attribution: "&copy; Google Maps",
    preview: "linear-gradient(135deg,#e8f0e0 0%,#f5f3ea 50%,#cfe3f5 100%)",
    maxZoom: 20,
  },
  hybrid: {
    name: "گوگل مپ (ترکیبی)",
    desc: "تصاویر ماهواره‌ای گوگل + نام خیابان‌ها و مکان‌ها",
    url: "https://mt{s}.google.com/vt/lyrs=y&hl=fa&x={x}&y={y}&z={z}",
    subdomains: ["0", "1", "2", "3"],
    attribution: "&copy; Google Maps",
    preview: "linear-gradient(135deg,#4a5a3a 0%,#7a6a4a 50%,#fbbf24 100%)",
    maxZoom: 20,
  },
  satellite: {
    name: "گوگل مپ (ماهواره‌ای)",
    desc: "تصاویر ماهواره‌ای خالص گوگل",
    url: "https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    subdomains: ["0", "1", "2", "3"],
    attribution: "&copy; Google Maps",
    preview: "linear-gradient(135deg,#3b4a2f 0%,#6b5c3e 50%,#2f3b2a 100%)",
    maxZoom: 20,
  },
  terrain: {
    name: "گوگل مپ (توپوگرافی)",
    desc: "نقشه گوگل با نمایش کوه‌ها، ارتفاعات و عوارض زمین",
    url: "https://mt{s}.google.com/vt/lyrs=p&hl=fa&x={x}&y={y}&z={z}",
    subdomains: ["0", "1", "2", "3"],
    attribution: "&copy; Google Maps",
    preview: "linear-gradient(135deg,#d9ead3 0%,#c9daf8 50%,#ead1dc 100%)",
    maxZoom: 20,
  },
  osm: {
    name: "OpenStreetMap",
    desc: "نقشه آزاد و جهانی",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"],
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    preview: "linear-gradient(135deg,#f2efe9 0%,#aad3df 50%,#cdebb0 100%)",
    maxZoom: 19,
  },
};

// ─── نشانگر سبز یکپارچه روی نقشه ──────────────────────────────────────────

export const MARKER_TYPES: Record<MarkerKind, { label: string; color: string; soft: string }> = {
  green: { label: "سبز", color: "#16a34a", soft: "rgba(22,163,74,0.45)" },
};

export const MARKER_ORDER: MarkerKind[] = ["green"];

export const isMarkerKind = (v: unknown): v is MarkerKind => v === "green";
