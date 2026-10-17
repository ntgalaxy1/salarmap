import { useEffect, useState } from "react";
import {
  Download,
  HelpCircle,
  List,
  MapPin,
  MoreVertical,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import type { MarkerKind, Place } from "../types";
import { BUILD_INFO } from "../buildInfo";
import { getCustomAppIcon } from "../lib/image";
import { toFa } from "../utils/geo";
import { cn } from "../utils/cn";

interface Props {
  allPlaces: Place[];
  query: string;
  onQuery: (q: string) => void;
  kindFilter?: MarkerKind | "all";
  onKindFilter?: (k: MarkerKind | "all") => void;
  results: Place[];
  onPick: (id: string, place?: Place) => void;
  onOpenList: () => void;
  onOpenGuide: () => void;
  onAdminLogin: () => void;
  onInstall?: () => void;
}

/** هدر صفحه اصلی (نمای کاربر) — چیدمان فشرده و مرتب برای صفحه‌های کوچک */
export default function Header({
  allPlaces,
  query,
  onQuery,
  results,
  onPick,
  onOpenList,
  onOpenGuide,
  onAdminLogin,
  onInstall,
}: Props) {
  const [menu, setMenu] = useState(false);
  const [customIcon, setCustomIcon] = useState<string | null>(() => getCustomAppIcon());
  const showResults = query.trim().length > 0;

  useEffect(() => {
    const sync = () => setCustomIcon(getCustomAppIcon());
    window.addEventListener("salarmap-icon-change", sync);
    return () => window.removeEventListener("salarmap-icon-change", sync);
  }, []);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[1100] p-2 sm:p-3 sm:pt-[max(0.75rem,env(safe-area-inset-top))]">
      {menu && (
        <div className="pointer-events-auto fixed inset-0 z-0" onClick={() => setMenu(false)} />
      )}

      <div className="pointer-events-auto relative z-30 rounded-2xl bg-white/95 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur">
        {/* ردیف عنوان و دکمه‌ها */}
        <div className="flex items-center gap-1.5 px-2 pt-2 sm:gap-2 sm:px-3 sm:pt-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-900 text-white sm:h-10 sm:w-10">
            {customIcon ? (
              <img src={customIcon} alt="سالار مپ" className="h-full w-full object-cover" />
            ) : (
              <MapPin className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-extrabold leading-tight text-slate-900 sm:text-base">
              سالار مپ
            </h1>
            <p className="truncate text-[10px] leading-4 text-slate-500 sm:text-[11px]">
              {toFa(allPlaces.length)} مکان روی نقشه
            </p>
          </div>

          {onInstall && (
            <button
              onClick={onInstall}
              className="hidden h-9 shrink-0 items-center gap-1 rounded-xl bg-slate-900 px-2.5 text-xs font-bold text-white shadow hover:bg-slate-800 sm:flex"
              title="نصب برنامه روی گوشی"
            >
              <Download className="h-4 w-4" />
              نصب
            </button>
          )}

          <button
            onClick={onOpenList}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
            title="لیست مکان‌ها"
            aria-label="لیست مکان‌ها"
          >
            <List className="h-[18px] w-[18px]" />
          </button>

          <div className="relative shrink-0">
            <button
              onClick={() => setMenu((v) => !v)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-200",
                menu ? "bg-slate-200" : "bg-slate-100"
              )}
              title="منو"
              aria-label="منو"
            >
              <MoreVertical className="h-[18px] w-[18px]" />
            </button>

            {menu && (
              <div className="absolute left-0 top-full z-30 mt-1.5 w-52 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 animate-pop-in">
                {onInstall && (
                  <button
                    onClick={() => {
                      setMenu(false);
                      onInstall();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-right text-xs font-bold text-slate-800 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4 shrink-0 text-slate-500" />
                    نصب برنامه روی گوشی
                  </button>
                )}
                <button
                  onClick={() => {
                    setMenu(false);
                    onOpenGuide();
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-right text-xs font-bold text-slate-800 hover:bg-slate-50"
                >
                  <HelpCircle className="h-4 w-4 shrink-0 text-slate-500" />
                  راهنما و امکانات
                </button>
                <button
                  onClick={() => {
                    setMenu(false);
                    onAdminLogin();
                  }}
                  className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-right text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" />
                  ورود مدیر
                </button>
                {BUILD_INFO.number !== "dev" && (
                  <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-center text-[10px] font-bold text-slate-400">
                    نسخه {toFa(BUILD_INFO.number)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* جستجو */}
        <div className="relative px-2 pb-2 pt-2 sm:px-3 sm:pb-3">
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-2.5 focus-within:ring-2 focus-within:ring-slate-900/15">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="جستجوی مکان…"
              className="h-10 w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-slate-400"
            />
            {query && (
              <button
                onClick={() => onQuery("")}
                className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                aria-label="پاک کردن"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {showResults && (
            <div className="absolute inset-x-2 top-full z-10 mt-1 max-h-[55vh] overflow-y-auto rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/10 animate-pop-in sm:inset-x-3">
              {results.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-500">موردی پیدا نشد.</p>
              ) : (
                results.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onPick(p.id, p)}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-right hover:bg-slate-50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                      <MapPin className="h-4 w-4 text-emerald-600" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-bold text-slate-900">{p.name}</span>
                      <span className="block truncate text-[11px] text-slate-500">{p.short}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
