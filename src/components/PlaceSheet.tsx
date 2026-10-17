import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Crosshair,
  ExternalLink,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  Share2,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import type { Place } from "../types";
import { googleDirectionsUrl, googlePlaceUrl, toFa } from "../utils/geo";
import { cn } from "../utils/cn";
import Gallery from "./Gallery";
import KindBadge from "./KindBadge";

interface Props {
  place: Place;
  onClose: () => void;
  onToast: (msg: string) => void;
  /** عملیات مدیر (فقط داخل پنل مدیریت) */
  admin?: {
    onEdit: () => void;
    onMove: () => void;
    onDelete: () => void;
  };
}

/**
 * پنل اطلاعات مکان
 * - موبایل: صفحه کشویی از پایین با قابلیت کشیدن
 * - دسکتاپ: پنل کناری
 */
export default function PlaceSheet({ place, onClose, onToast, admin }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const startY = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setExpanded(false);
    setConfirmDelete(false);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [place.id]);

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startY.current == null) return;
    const dy = e.changedTouches[0].clientY - startY.current;
    startY.current = null;
    const atTop = (scrollRef.current?.scrollTop ?? 0) <= 2;
    if (dy > 60 && atTop) {
      if (expanded) setExpanded(false);
      else onClose();
    } else if (dy < -60) {
      setExpanded(true);
    }
  };

  const share = async () => {
    const url = googlePlaceUrl(place.lat, place.lng);
    const text = `${place.name}${place.short ? ` — ${place.short}` : ""}${place.address ? `\n${place.address}` : ""}`;
    try {
      if (navigator.share) await navigator.share({ title: place.name, text, url });
      else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        onToast("اطلاعات مکان کپی شد");
      }
    } catch {
      /* لغو */
    }
  };

  const copyCoords = async () => {
    try {
      await navigator.clipboard.writeText(`${place.lat}, ${place.lng}`);
      onToast("مختصات کپی شد");
    } catch {
      onToast("امکان کپی وجود ندارد");
    }
  };

  return (
    <section
      className={cn(
        "fixed z-[1200] flex flex-col bg-white shadow-[0_-8px_40px_rgba(15,23,42,0.25)]",
        "inset-x-0 bottom-0 rounded-t-3xl animate-sheet-up transition-[height] duration-300 ease-out",
        expanded ? "h-[92dvh]" : "h-[54dvh]",
        "md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-[420px] md:rounded-none md:rounded-l-3xl md:animate-panel-in md:shadow-2xl"
      )}
      aria-label={`اطلاعات ${place.name}`}
    >
      <div
        className="flex shrink-0 cursor-grab flex-col items-center pt-2 md:hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="h-1.5 w-12 rounded-full bg-slate-300" />
        <span className="mt-0.5 text-slate-400">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </span>
      </div>

      <button
        onClick={onClose}
        className="absolute left-3 top-3 z-10 rounded-full bg-white/90 p-2 text-slate-700 shadow ring-1 ring-slate-900/10 hover:bg-white md:top-4"
        aria-label="بستن"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <Gallery images={place.images} alt={place.name} className="h-48 md:h-64" />

        <div className="space-y-5 px-4 pt-4 md:px-5">
          {admin && (
            <div className="flex items-center gap-1.5 rounded-2xl bg-slate-900 p-1.5 text-white">
              <span className="flex items-center gap-1 px-2 text-[11px] font-extrabold">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                مدیر
              </span>
              <button
                onClick={admin.onEdit}
                className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-white/10 text-xs font-bold hover:bg-white/20"
              >
                <Pencil className="h-3.5 w-3.5" />
                ویرایش
              </button>
              <button
                onClick={admin.onMove}
                className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-white/10 text-xs font-bold hover:bg-white/20"
              >
                <Crosshair className="h-3.5 w-3.5" />
                جابه‌جایی
              </button>
              <button
                onClick={() => {
                  if (!confirmDelete) {
                    setConfirmDelete(true);
                    setTimeout(() => setConfirmDelete(false), 3000);
                    return;
                  }
                  admin.onDelete();
                }}
                className={cn(
                  "flex h-9 flex-1 items-center justify-center gap-1 rounded-xl text-xs font-bold transition",
                  confirmDelete ? "bg-red-600 text-white" : "bg-white/10 text-red-300 hover:bg-red-600 hover:text-white"
                )}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {confirmDelete ? "مطمئنید؟" : "حذف"}
              </button>
            </div>
          )}

          {/* عنوان و خلاصه */}
          <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <KindBadge kind={place.kind} />
            <h2 className="mt-2 text-xl font-extrabold leading-snug text-slate-900">{place.name}</h2>
            {place.nameEn && (
              <p className="text-xs text-slate-400" dir="ltr">
                {place.nameEn}
              </p>
            )}
            {place.short && (
              <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-600">{place.short}</p>
            )}
          </div>

          {/* توضیحات کامل */}
          {place.description && (
            <div className="prose-fa">
              <h3 className="mb-1.5 text-sm font-extrabold text-slate-900">توضیحات</h3>
              <p className="whitespace-pre-line text-justify text-sm text-slate-700">{place.description}</p>
            </div>
          )}

          {/* مشخصات */}
          <div className="divide-y divide-slate-100 rounded-2xl bg-slate-50 ring-1 ring-slate-100">
            {place.address && (
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="آدرس">
                {place.address}
              </InfoRow>
            )}
            {place.hours && (
              <InfoRow icon={<Clock className="h-4 w-4" />} label="ساعت کار / بازدید">
                {place.hours}
              </InfoRow>
            )}
            {place.phone && (
              <InfoRow icon={<Phone className="h-4 w-4" />} label="تلفن">
                <a href={`tel:${place.phone}`} className="text-blue-700 underline-offset-2 hover:underline" dir="ltr">
                  {toFa(place.phone)}
                </a>
              </InfoRow>
            )}
            {place.website && (
              <InfoRow icon={<ExternalLink className="h-4 w-4" />} label="وب‌سایت">
                <a
                  href={place.website}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-blue-700 underline-offset-2 hover:underline"
                  dir="ltr"
                >
                  {place.website}
                </a>
              </InfoRow>
            )}
            <InfoRow icon={<Copy className="h-4 w-4" />} label="مختصات">
              <button
                onClick={copyCoords}
                className="font-mono text-xs text-slate-700 hover:text-slate-900"
                dir="ltr"
                title="کپی مختصات"
              >
                {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
              </button>
            </InfoRow>
          </div>

          {/* دکمه‌های مسیریابی، گوگل مپ و اشتراک در انتهای صفحه */}
          <div className="grid grid-cols-3 gap-2 pt-1 pb-2">
            <a
              href={googleDirectionsUrl(place.lat, place.lng)}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-slate-900 px-2 py-3 text-xs font-bold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
            >
              <Navigation className="h-5 w-5" />
              مسیریابی
            </a>
            <a
              href={googlePlaceUrl(place.lat, place.lng)}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-slate-100 px-2 py-3 text-xs font-bold text-slate-800 hover:bg-slate-200"
            >
              <ExternalLink className="h-5 w-5" />
              گوگل مپ
            </a>
            <button
              onClick={share}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-slate-100 px-2 py-3 text-xs font-bold text-slate-800 hover:bg-slate-200"
            >
              <Share2 className="h-5 w-5" />
              اشتراک
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-3.5 py-3">
      <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-slate-400">{label}</p>
        <div className="text-sm leading-relaxed text-slate-800">{children}</div>
      </div>
    </div>
  );
}
