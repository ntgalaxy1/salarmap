/**
 * ابزار دانلود و اشتراک‌گذاری سازگار با Firefox Android و محیط‌های داخل iframe / WebView
 *
 * چرا در فایرفاکس اندروید دانلود معمولی کار نمی‌کند؟
 * ۱) فایرفاکس لینک‌های data: بسیار بزرگ را برای دانلود قبول نمی‌کند (فقط Blob URL را قبول می‌کند)
 * ۲) داخل iframe اگر دانلود مستقیم مسدود باشد، باز کردن در پنجره/تب جدید یا آپلود موقت و دادن لینک مستقیم کار می‌کند
 */

/** تلاش چندمرحله‌ای برای دانلود یا اشتراک‌گذاری یک Blob در فایرفاکس و کروم */
export async function smartDownloadOrShare(opts: {
  blob: Blob;
  fileName: string;
  title: string;
  forceShareFirst?: boolean;
}): Promise<"shared" | "downloaded"> {
  const { blob, fileName, title, forceShareFirst } = opts;

  // ۱) اگر کاربر اشتراک‌گذاری خواسته و مرورگر پشتیبانی می‌کند
  if (forceShareFirst && typeof navigator !== "undefined" && navigator.canShare) {
    try {
      const file = new File([blob], fileName, { type: blob.type || "application/octet-stream" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ title, files: [file] });
        return "shared";
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return "shared";
    }
  }

  // ۲) ساخت Blob با نوع application/octet-stream تا فایرفاکس به‌جای نمایش، پنجره «Save file» را باز کند
  const downloadBlob = new Blob([blob], { type: "application/octet-stream" });
  const blobUrl = URL.createObjectURL(downloadBlob);

  // تلاش با <a download> در همان صفحه و هدف _blank برای دور زدن محدودیت iframe در فایرفاکس
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();

  // آزادسازی حافظه پس از ۲ دقیقه (فایرفاکس برای نمایش دیالوگ دانلود نیاز دارد URL زنده بماند)
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
  return "downloaded";
}

/**
 * ساخت لینک دانلود مستقیم اینترنتی (مخصوص زمانی که مرورگر داخل iframe اجازه دانلود محلی نمی‌دهد)
 * فایل را روی سرویس موقت امن آپلود می‌کند و یک لینک https مستقیم برمی‌گرداند که در فایرفاکس ۱۰۰٪ دانلود می‌شود.
 */
export async function createDirectCloudDownloadUrl(blob: Blob, fileName: string): Promise<string> {
  // تلاش اول: tmpfiles.org (پشتیبانی کامل از CORS در مرورگر)
  try {
    const fd = new FormData();
    fd.append("file", new File([blob], fileName, { type: blob.type || "application/octet-stream" }));
    const res = await fetch("https://tmpfiles.org/api/v1/upload", {
      method: "POST",
      body: fd,
    });
    if (res.ok) {
      const j = (await res.json()) as { data?: { url?: string } };
      if (j.data?.url) {
        // تبدیل آدرس صفحه به لینک دانلود مستقیم (/dl/)
        return j.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
      }
    }
  } catch {
    /* سراغ سرویس دوم می‌رویم */
  }

  // تلاش دوم: file.io (لینک یک‌بار مصرف مستقیم)
  const fd2 = new FormData();
  fd2.append("file", new File([blob], fileName, { type: blob.type || "application/octet-stream" }));
  const res2 = await fetch("https://file.io/?expires=1d", {
    method: "POST",
    body: fd2,
  });
  if (res2.ok) {
    const j2 = (await res2.json()) as { link?: string };
    if (j2.link) return j2.link;
  }

  throw new Error("امکان ساخت لینک مستقیم اینترنتی نبود؛ از دکمه ارسال مستقیم به گیت‌هاب استفاده کنید.");
}
