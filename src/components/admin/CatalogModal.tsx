import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  Eye,
  LayoutGrid,
  ListFilter,
  Loader2,
  Printer,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import type { MarkerKind, Place } from "../../types";
import { MARKER_TYPES } from "../../data/mapConfig";
import { smartDownloadOrShare } from "../../lib/downloadHelper";
import { googlePlaceUrl, toFa } from "../../utils/geo";
import { cn } from "../../utils/cn";
import KindBadge from "../KindBadge";

interface Props {
  places: Place[];
  initialFilter?: MarkerKind | "all";
  onClose: () => void;
  onToast: (msg: string) => void;
}

type LayoutStyle = "grid" | "compact";

interface GeneratedCatalog {
  dataUrl: string;
  blob: Blob;
  fileName: string;
  count: number;
}

/** بارگذاری تصویر با CORS برای رسم روی Canvas (اگر تصویر خارجی اجازه ندهد، بدون خطا رد می‌شود) */
function loadImageSafe(src: string, timeoutMs = 7000): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = (res: HTMLImageElement | null) => {
      if (done) return;
      done = true;
      resolve(res);
    };
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    if (/^https?:\/\//i.test(src)) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      clearTimeout(timer);
      finish(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      finish(null);
    };
    img.src = src;
  });
}

/** رسم مستطیل با گوشه‌های گرد روی Canvas */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

/** شکستن متن فارسی در چند خط با حداکثر تعداد خط */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const words = cleaned.split(" ");
  const lines: string[] = [];
  let current = "";

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth || !current) {
      current = test;
    } else {
      lines.push(current);
      current = w;
      if (lines.length === maxLines - 1) {
        const rest = words.slice(i).join(" ");
        let tail = rest;
        while (tail.length > 1 && ctx.measureText(tail + "…").width > maxWidth) {
          tail = tail.slice(0, -1).trim();
        }
        lines.push(tail === rest ? tail : tail + "…");
        return lines;
      }
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

/** رسم تصویر به‌صورت object-fit: cover داخل کادر */
function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const ir = img.naturalWidth / Math.max(1, img.naturalHeight);
  const cr = w / h;
  let sx = 0,
    sy = 0,
    sw = img.naturalWidth,
    sh = img.naturalHeight;
  if (ir > cr) {
    sw = img.naturalHeight * cr;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / cr;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** ساخت تصویر یکپارچه کاتالوگ (خروجی هم به صورت dataUrl برای پیش‌نمایش قطعی و هم Blob برای ارسال) */
async function renderCatalogImage(opts: {
  title: string;
  subtitle: string;
  places: Place[];
  layout: LayoutStyle;
}): Promise<GeneratedCatalog> {
  const { title, subtitle, places, layout } = opts;
  const font = 'Vazirmatn, Tahoma, "Segoe UI", sans-serif';

  const loadedImages = await Promise.all(places.map((p) => loadImageSafe(p.images[0] ?? "")));

  const W = 1240;
  const PAD = 44;
  const GAP = 24;
  const HEADER_H = 168;
  const FOOTER_H = 74;

  const isGrid = layout === "grid";
  const COLS = isGrid ? 2 : 1;
  const CARD_W = isGrid ? (W - PAD * 2 - GAP) / 2 : W - PAD * 2;
  const CARD_H = isGrid ? 410 : 178;
  const rows = Math.max(1, Math.ceil(places.length / COLS));
  const H = HEADER_H + PAD + rows * CARD_H + Math.max(0, rows - 1) * GAP + FOOTER_H;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("مرورگر از ساخت تصویر پشتیبانی نمی‌کند");

  // پس‌زمینه کلی
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0, 0, W, H);

  // هدر سرمه‌ای شیک
  const grad = ctx.createLinearGradient(0, 0, W, HEADER_H);
  grad.addColorStop(0, "#0f172a");
  grad.addColorStop(1, "#1e293b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, HEADER_H);

  // دایره تزیینی سبز در هدر
  ctx.fillStyle = "#16a34a";
  ctx.beginPath();
  ctx.arc(PAD + 22, 58, 14, 0, Math.PI * 2);
  ctx.fill();

  // عنوان کاتالوگ (راست‌چین)
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 34px ${font}`;
  ctx.fillText(title || "کاتالوگ سالار مپ", W - PAD, 68);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = `600 18px ${font}`;
  const dateFa = new Date().toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const statsText =
    subtitle.trim() ||
    `مجموع: ${toFa(places.length)} مکان ثبت‌شده  |  تاریخ: ${dateFa}`;
  ctx.fillText(statsText, W - PAD, 112);

  // خط جداکننده سبز پایین هدر
  ctx.fillStyle = "#16a34a";
  ctx.fillRect(0, HEADER_H - 5, W, 5);

  // رسم کارت‌های مکان‌ها
  places.forEach((p, idx) => {
    const col = isGrid ? idx % 2 : 0;
    const row = isGrid ? Math.floor(idx / 2) : idx;
    const x = isGrid ? (col === 0 ? W - PAD - CARD_W : PAD) : PAD;
    const y = HEADER_H + 28 + row * (CARD_H + GAP);
    const kindDef = MARKER_TYPES[p.kind];
    const img = loadedImages[idx];

    // سایه و بدنه کارت
    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.08)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    roundRect(ctx, x, y, CARD_W, CARD_H, 22);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    roundRect(ctx, x, y, CARD_W, CARD_H, 22);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (isGrid) {
      const IMG_H = 195;
      ctx.save();
      roundRect(ctx, x, y, CARD_W, IMG_H, 22);
      ctx.clip();
      if (img) {
        try {
          drawCoverImage(ctx, img, x, y, CARD_W, IMG_H);
        } catch {
          ctx.fillStyle = "#e2e8f0";
          ctx.fillRect(x, y, CARD_W, IMG_H);
        }
      } else {
        const g = ctx.createLinearGradient(x, y, x + CARD_W, y + IMG_H);
        g.addColorStop(0, p.kind === "green" ? "#dcfce7" : "#ede9fe");
        g.addColorStop(1, "#e2e8f0");
        ctx.fillStyle = g;
        ctx.fillRect(x, y, CARD_W, IMG_H);
        ctx.fillStyle = kindDef.color;
        ctx.font = `800 22px ${font}`;
        ctx.textAlign = "center";
        ctx.fillText(p.name, x + CARD_W / 2, y + IMG_H / 2 + 8);
      }
      ctx.restore();

      ctx.fillStyle = kindDef.color;
      ctx.fillRect(x, y + IMG_H - 5, CARD_W, 5);

      ctx.save();
      roundRect(ctx, x + CARD_W - 128, y + 14, 114, 32, 16);
      ctx.fillStyle = kindDef.color;
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 14px ${font}`;
      ctx.textAlign = "center";
      ctx.fillText(`${toFa(idx + 1)} • نشانگر ${kindDef.label}`, x + CARD_W - 71, y + 35);
      ctx.restore();

      const tx = x + CARD_W - 20;
      const maxTw = CARD_W - 40;
      ctx.direction = "rtl";
      ctx.textAlign = "right";
      ctx.fillStyle = "#0f172a";
      ctx.font = `900 22px ${font}`;
      const titleLine = wrapLines(ctx, p.name, maxTw, 1)[0] ?? p.name;
      ctx.fillText(titleLine, tx, y + IMG_H + 36);

      const summary = p.short || p.description || "بدون توضیح";
      ctx.fillStyle = "#475569";
      ctx.font = `500 15.5px ${font}`;
      const descLines = wrapLines(ctx, summary, maxTw, 3);
      descLines.forEach((line, li) => {
        ctx.fillText(line, tx, y + IMG_H + 68 + li * 25);
      });

      ctx.strokeStyle = "#f1f5f9";
      ctx.beginPath();
      ctx.moveTo(x + 18, y + CARD_H - 56);
      ctx.lineTo(x + CARD_W - 18, y + CARD_H - 56);
      ctx.stroke();

      ctx.fillStyle = "#334155";
      ctx.font = `600 13.5px ${font}`;
      const addrText = p.address
        ? `📍 ${p.address}`
        : p.hours
          ? `🕒 ${p.hours}`
          : "📍 تبریز";
      const addrLine = wrapLines(ctx, addrText, maxTw, 1)[0] ?? "";
      ctx.fillText(addrLine, tx, y + CARD_H - 32);

      ctx.fillStyle = "#64748b";
      ctx.font = `600 12.5px monospace`;
      ctx.direction = "ltr";
      ctx.textAlign = "left";
      const coordStr = `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}${p.phone ? `  |  ☎ ${p.phone}` : ""}`;
      ctx.fillText(coordStr, x + 20, y + CARD_H - 12);
    } else {
      const IMG_W = 210;
      const imgX = x + CARD_W - IMG_W;
      ctx.save();
      roundRect(ctx, imgX, y, IMG_W, CARD_H, 22);
      ctx.clip();
      if (img) {
        try {
          drawCoverImage(ctx, img, imgX, y, IMG_W, CARD_H);
        } catch {
          ctx.fillStyle = "#e2e8f0";
          ctx.fillRect(imgX, y, IMG_W, CARD_H);
        }
      } else {
        ctx.fillStyle = p.kind === "green" ? "#dcfce7" : "#ede9fe";
        ctx.fillRect(imgX, y, IMG_W, CARD_H);
      }
      ctx.restore();

      ctx.fillStyle = kindDef.color;
      ctx.fillRect(imgX - 5, y, 5, CARD_H);

      const tx = imgX - 22;
      const maxTw = CARD_W - IMG_W - 44;

      ctx.direction = "rtl";
      ctx.textAlign = "right";
      ctx.fillStyle = kindDef.color;
      ctx.font = `800 14px ${font}`;
      ctx.fillText(`#${toFa(idx + 1)} • نشانگر ${kindDef.label}`, tx, y + 32);

      ctx.fillStyle = "#0f172a";
      ctx.font = `900 22px ${font}`;
      const titleLine = wrapLines(ctx, p.name, maxTw, 1)[0] ?? p.name;
      ctx.fillText(titleLine, tx, y + 62);

      ctx.fillStyle = "#475569";
      ctx.font = `500 15.5px ${font}`;
      const summary = p.short || p.description || "";
      const descLines = wrapLines(ctx, summary, maxTw, 2);
      descLines.forEach((l, li) => ctx.fillText(l, tx, y + 92 + li * 24));

      ctx.fillStyle = "#64748b";
      ctx.font = `600 13.5px ${font}`;
      const metaParts = [
        p.address ? `📍 ${p.address}` : "",
        p.phone ? `☎ ${toFa(p.phone)}` : "",
        `(${p.lat.toFixed(4)}, ${p.lng.toFixed(4)})`,
      ].filter(Boolean);
      const metaLine = wrapLines(ctx, metaParts.join("   ·   "), maxTw, 1)[0] ?? "";
      ctx.fillText(metaLine, tx, y + CARD_H - 18);
    }
  });

  // فوتر
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.fillStyle = "#64748b";
  ctx.font = `700 15px ${font}`;
  ctx.fillText(
    `کاتالوگ رسمی سالار مپ — شامل ${toFa(places.length)} مکان ثبت‌شده`,
    W / 2,
    H - 28
  );

  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("خطا در ساخت فایل تصویر کاتالوگ"))),
      "image/jpeg",
      0.92
    );
  });

  return {
    dataUrl,
    blob,
    fileName: `salar-map-catalog-${places.length}.jpg`,
    count: places.length,
  };
}

/** ساخت متن خلاصه و مرتب از کاتالوگ برای ارسال متنی در پیام‌رسان‌ها */
function buildTextCatalog(title: string, places: Place[]): string {
  const lines: string[] = [`📌 ${title || "کاتالوگ سالار مپ"}`, `تعداد کل: ${toFa(places.length)} مکان`, "───────────────"];
  places.forEach((p, idx) => {
    lines.push(`${toFa(idx + 1)}. 🟢 ${p.name}`);
    if (p.short || p.description) lines.push(`   📝 ${p.short || p.description}`);
    if (p.address) lines.push(`   📍 آدرس: ${p.address}`);
    if (p.phone) lines.push(`   ☎ تلفن: ${p.phone}`);
    if (p.hours) lines.push(`   🕒 ساعت: ${p.hours}`);
    lines.push(`   🗺 نقشه: ${googlePlaceUrl(p.lat, p.lng)}`);
    lines.push("");
  });
  return lines.join("\n");
}

export default function CatalogModal({ places, onClose, onToast }: Props) {
  const kindFilter: MarkerKind | "all" = "all";
  const [layout, setLayout] = useState<LayoutStyle>("grid");
  const [title, setTitle] = useState("کاتالوگ سالار مپ");
  const [subtitle, setSubtitle] = useState("");
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);

  // وقتی عکس کاتالوگ ساخته می‌شود، این استیت پر می‌شود و پنجره پیش‌نمایش و ارسال مستقیم عکس باز می‌شود
  const [generated, setGenerated] = useState<GeneratedCatalog | null>(null);

  const filteredByKind = useMemo(
    () => places.filter((p) => kindFilter === "all" || p.kind === kindFilter),
    [places, kindFilter]
  );

  const activePlaces = useMemo(
    () => filteredByKind.filter((p) => !excludedIds.has(p.id)),
    [filteredByKind, excludedIds]
  );

  const togglePlace = (id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** ساخت عکس کاتالوگ و باز کردن فوری صفحه پیش‌نمایش بزرگ + گزینه‌های ارسال */
  const buildAndOpenPreview = async (alsoDownload = false) => {
    if (activePlaces.length === 0) {
      onToast("حداقل یک مکان را برای کاتالوگ انتخاب کنید");
      return;
    }
    setBusy(true);
    try {
      const result = await renderCatalogImage({
        title,
        subtitle,
        places: activePlaces,
        layout,
      });
      setGenerated(result);

      if (alsoDownload) {
        triggerDownload(result);
      }
    } catch (e) {
      onToast(e instanceof Error ? e.message : "خطا در تولید عکس کاتالوگ");
    } finally {
      setBusy(false);
    }
  };

  const triggerDownload = (cat: GeneratedCatalog) => {
    void smartDownloadOrShare({
      blob: cat.blob,
      fileName: cat.fileName,
      title: title || "کاتالوگ سالار مپ",
      forceShareFirst: false,
    });
    onToast("✅ دانلود عکس آغاز شد (اگر در فایرفاکس هستید، کافی است انگشتتان را روی عکس زیر نگه دارید و Save image بزنید)");
  };

  const shareGeneratedImage = async (cat: GeneratedCatalog) => {
    const file = new File([cat.blob], cat.fileName, { type: "image/jpeg" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: title || "کاتالوگ سالار مپ",
          text: `${title || "کاتالوگ سالار مپ"} (${toFa(cat.count)} مکان)`,
          files: [file],
        });
        return;
      }
      if (navigator.share) {
        await navigator.share({
          title: title || "کاتالوگ سالار مپ",
          text: buildTextCatalog(title, activePlaces),
        });
        return;
      }
      triggerDownload(cat);
    } catch {
      /* کاربر پنجره اشتراک را بست */
    }
  };

  const copyTextSummary = async () => {
    try {
      await navigator.clipboard.writeText(buildTextCatalog(title, activePlaces));
      onToast("✅ متن کامل کاتالوگ (با لینک نقشه هر مکان) کپی شد — در تلگرام/واتساپ/ایتا Paste کنید");
    } catch {
      onToast("امکان کپی خودکار نبود");
    }
  };

  const shareTextSummary = async () => {
    const text = buildTextCatalog(title, activePlaces);
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
      } else {
        await navigator.clipboard.writeText(text);
        onToast("✅ متن کاتالوگ کپی شد");
      }
    } catch {
      /* لغو */
    }
  };

  return (
    <div className="fixed inset-0 z-[1380] flex items-end justify-center md:items-center md:p-4">
      <div className="absolute inset-0 bg-slate-900/70 animate-fade-in" onClick={onClose} />

      <div className="relative flex h-[95dvh] w-full max-w-4xl flex-col rounded-t-3xl bg-slate-100 shadow-2xl animate-sheet-up md:h-[90vh] md:rounded-3xl">
        {/* ═══════════════════════════════════════════════════════════════════
            حالت ۱: وقتی عکس ساخته شده ← صفحه پیش‌نمایش بزرگ خودِ عکس + دکمه‌های ارسال
           ═══════════════════════════════════════════════════════════════════ */}
        {generated ? (
          <>
            {/* هدر پیش‌نمایش عکس */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-3.5 text-white rounded-t-3xl">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGenerated(null)}
                  className="flex items-center gap-1 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-white/25"
                >
                  <ArrowRight className="h-4 w-4" />
                  ویرایش کاتالوگ
                </button>
                <div>
                  <h2 className="text-sm font-extrabold text-emerald-300">
                    ✅ پیش‌نمایش عکس نهایی کاتالوگ ({toFa(generated.count)} مکان)
                  </h2>
                  <p className="text-[11px] text-slate-300">
                    عکس شما آماده است! از دکمه‌های پایین برای ارسال استفاده کنید
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                aria-label="بستن"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* راهنمای طلایی ذخیره روی گوشی */}
            <div className="bg-emerald-50 px-4 py-2.5 text-xs leading-6 text-emerald-950 border-b border-emerald-200">
              💡 <b>راهنمای سریع روی گوشی:</b> برای ارسال به تلگرام، واتساپ، ایتا و... دکمه سبز{" "}
              <b>«ارسال و اشتراک‌گذاری عکس»</b> در پایین را بزنید. همچنین می‌توانید{" "}
              <b>انگشتتان را ۲ ثانیه روی عکس زیر نگه دارید</b> و گزینه <b>«ذخیره تصویر / Save image»</b> را بزنید تا
              مستقیم در گالری گوشی ذخیره شود!
            </div>

            {/* نمایش خودِ فایل عکس واقعی */}
            <div className="flex-1 overflow-auto bg-slate-900/95 p-3 md:p-6">
              <div className="mx-auto max-w-2xl">
                <img
                  src={generated.dataUrl}
                  alt={title}
                  className="w-full rounded-2xl shadow-2xl ring-2 ring-white/20"
                />
              </div>
            </div>

            {/* نوار ابزار ارسال و دانلود در پایین پیش‌نمایش */}
            <div className="border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="mx-auto grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => void shareGeneratedImage(generated)}
                  className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 sm:col-span-2"
                >
                  <Share2 className="h-4 w-4" />
                  ارسال و اشتراک‌گذاری عکس (تلگرام / واتساپ / گالری)
                </button>

                <button
                  type="button"
                  onClick={() => triggerDownload(generated)}
                  className="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-3 text-xs font-extrabold text-white hover:bg-slate-800"
                >
                  <Download className="h-4 w-4" />
                  دانلود فایل عکس
                </button>

                <button
                  type="button"
                  onClick={() => void copyTextSummary()}
                  className="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-slate-100 px-3 text-xs font-bold text-slate-800 hover:bg-slate-200"
                >
                  <Copy className="h-4 w-4" />
                  کپی متن کاتالوگ
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ═══════════════════════════════════════════════════════════════════
              حالت ۲: تنظیم و انتخاب مکان‌ها پیش از ساخت عکس
             ═══════════════════════════════════════════════════════════════════ */
          <>
            {/* هدر */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5 rounded-t-3xl">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-emerald-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    خروجی کاتالوگ تصویری (خلاصه و مفید)
                  </h2>
                  <p className="text-xs text-slate-500">
                    مکان‌ها را انتخاب کنید و دکمه سبز پایین را بزنید تا عکس نهایی ساخته و نمایش داده شود
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
                aria-label="بستن"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* بدنه قابل اسکرول */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {/* تنظیمات سریع کاتالوگ */}
              <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:grid-cols-2">
                <label className="block text-xs font-bold text-slate-700">
                  عنوان بالای کاتالوگ
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl bg-slate-100 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/20"
                    placeholder="کاتالوگ سالار مپ"
                  />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  توضیح زیر عنوان (اختیاری — خالی بماند آمار خودکار می‌نویسد)
                  <input
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl bg-slate-100 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/20"
                    placeholder="مثلاً: لیست شعب و مراکز منتخب"
                  />
                </label>

                {/* آمار مکان‌ها */}
                <div>
                  <span className="block text-xs font-bold text-slate-700">تعداد مکان‌های کاتالوگ</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white shadow"
                      style={{ background: MARKER_TYPES.green.color }}
                    >
                      <span className="h-2 w-2 rounded-full bg-white" />
                      همه مکان‌ها ({toFa(places.length)})
                    </span>
                  </div>
                </div>

                {/* قالب چیدمان */}
                <div>
                  <span className="block text-xs font-bold text-slate-700">قالب ظاهری کاتالوگ</span>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLayout("grid")}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ring-1",
                        layout === "grid"
                          ? "bg-slate-900 text-white ring-slate-900"
                          : "bg-slate-50 text-slate-700 ring-slate-200 hover:bg-slate-100"
                      )}
                    >
                      <LayoutGrid className="h-4 w-4" />
                      کاتالوگ گالری (۲ ستونی)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLayout("compact")}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ring-1",
                        layout === "compact"
                          ? "bg-slate-900 text-white ring-slate-900"
                          : "bg-slate-50 text-slate-700 ring-slate-200 hover:bg-slate-100"
                      )}
                    >
                      <ListFilter className="h-4 w-4" />
                      فهرست خلاصه (فشرده)
                    </button>
                  </div>
                </div>
              </div>

              {/* انتخاب تکی مکان‌ها */}
              <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800">
                    مکان‌های انتخاب‌شده ({toFa(activePlaces.length)} از {toFa(filteredByKind.length)}) — برای حذف/افزودن
                    روی نام بزنید:
                  </span>
                  {excludedIds.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setExcludedIds(new Set())}
                      className="text-[11px] font-bold text-blue-700 hover:underline"
                    >
                      انتخاب همه
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {filteredByKind.map((p) => {
                    const included = !excludedIds.has(p.id);
                    const c = MARKER_TYPES[p.kind].color;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePlace(p.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition ring-1",
                          included
                            ? "bg-slate-900 text-white ring-slate-900"
                            : "bg-slate-100 text-slate-400 line-through ring-slate-200"
                        )}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                        {p.name}
                        {included && <Check className="h-3 w-3 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* پیش‌نمایش چینش کارت‌ها */}
              <div className="overflow-hidden rounded-3xl bg-slate-200/70 p-3 ring-1 ring-slate-300">
                <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-slate-100 shadow-xl ring-1 ring-slate-900/10">
                  <div className="bg-gradient-to-l from-slate-900 to-slate-800 px-5 py-5 text-white">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 rounded-full bg-green-600 ring-2 ring-white/80" />
                        <span className="text-xs font-bold text-slate-300">پیش‌نمایش کاتالوگ</span>
                      </div>
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                        {toFa(activePlaces.length)} مکان
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-extrabold">{title || "کاتالوگ سالار مپ"}</h3>
                    <p className="mt-1 text-xs text-slate-300">
                      {subtitle.trim() || `مجموع: ${toFa(activePlaces.length)} مکان ثبت‌شده`}
                    </p>
                  </div>
                  <div className="h-1.5 bg-emerald-500" />

                  <div
                    className={cn(
                      "p-4",
                      layout === "grid" ? "grid gap-3 sm:grid-cols-2" : "space-y-2.5"
                    )}
                  >
                    {activePlaces.map((p, idx) => (
                      <div
                        key={p.id}
                        className={cn(
                          "overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200",
                          layout === "compact" && "flex items-center gap-3 p-2.5"
                        )}
                      >
                        {layout === "grid" ? (
                          <>
                            <div className="relative h-36 w-full bg-slate-200">
                              {p.images[0] ? (
                                <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs font-bold text-slate-500">
                                  {p.name}
                                </div>
                              )}
                              <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
                                <span className="rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-bold text-white">
                                  #{toFa(idx + 1)}
                                </span>
                                <KindBadge kind={p.kind} />
                              </div>
                            </div>
                            <div className="p-3">
                              <h4 className="truncate text-sm font-extrabold text-slate-900">{p.name}</h4>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                                {p.short || p.description || "—"}
                              </p>
                              <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                                <span className="truncate">{p.address || "تبریز"}</span>
                                <span className="shrink-0 font-mono text-[10px]" dir="ltr">
                                  {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                                </span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                              {p.images[0] ? (
                                <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                                  بدون عکس
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-extrabold text-slate-400">#{toFa(idx + 1)}</span>
                                <KindBadge kind={p.kind} />
                                <h4 className="truncate text-sm font-extrabold text-slate-900">{p.name}</h4>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-slate-600">
                                {p.short || p.description || "—"}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                                {p.address || "تبریز"} ·{" "}
                                <span className="font-mono" dir="ltr">
                                  {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                                </span>
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* دکمه‌های پایین */}
            <div className="border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void buildAndOpenPreview(false)}
                  disabled={busy || activePlaces.length === 0}
                  className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  {busy ? "در حال ساخت عکس کاتالوگ…" : "ساخت عکس، پیش‌نمایش و ارسال"}
                </button>

                <button
                  type="button"
                  onClick={() => void shareTextSummary()}
                  disabled={activePlaces.length === 0}
                  className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-3 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Share2 className="h-4 w-4" />
                  ارسال متن خلاصه
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-slate-100 px-3 text-xs font-bold text-slate-800 hover:bg-slate-200"
                  title="چاپ یا ذخیره PDF"
                >
                  <Printer className="h-4 w-4" />
                  PDF
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
