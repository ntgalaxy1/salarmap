/**
 * فشرده‌سازی تصویر در مرورگر قبل از آپلود
 * (عکس‌های دوربین گوشی چند مگابایت‌اند؛ اینجا به حدود ۱۰۰ تا ۲۵۰ کیلوبایت می‌رسند)
 */
export async function compressImage(
  file: File | Blob,
  maxSide = 1280,
  quality = 0.78
): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("فایل تصویر قابل خواندن نیست"));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas پشتیبانی نمی‌شود");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

/** حجم تقریبی (بایت) یک data URL */
export function estimateBytes(dataUrl: string): number {
  const b64 = dataUrlToBase64(dataUrl);
  return Math.round((b64.length * 3) / 4);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** نام فایل یکتا برای تصویر جدید */
export function newImageName(placeId: string): string {
  const safe = placeId.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "img";
  return `${safe}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.jpg`;
}

/** تبدیل هر تصویر انتخابی به آیکون مربعی استاندارد PNG (512x512) برای آیکون اپلیکیشن */
export async function makeSquareAppIcon(file: File | Blob, size = 512): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("فایل آیکون قابل خواندن نیست"));
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas پشتیبانی نمی‌شود");
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, size, size);

    // برش مربعی از مرکز تصویر (object-fit: cover)
    const minSide = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - minSide) / 2;
    const sy = (img.naturalHeight - minSide) / 2;
    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

const CUSTOM_ICON_KEY = "tm.app.icon";

export function getCustomAppIcon(): string | null {
  try {
    return localStorage.getItem(CUSTOM_ICON_KEY);
  } catch {
    return null;
  }
}

export function setCustomAppIcon(dataUrl: string | null): void {
  try {
    if (dataUrl) localStorage.setItem(CUSTOM_ICON_KEY, dataUrl);
    else localStorage.removeItem(CUSTOM_ICON_KEY);
    window.dispatchEvent(new Event("salarmap-icon-change"));
  } catch {
    /* ignore */
  }
}
