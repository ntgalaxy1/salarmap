import { useEffect, useState } from "react";
import {
  Download,
  HelpCircle,
  List,
  MapPin,
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

/** هدر فشرده و تک‌ردیفی نمای کاربر: [منو] [جستجو] [لیست] */
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
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[1100] p-2 pt-[max(0.4rem,env(safe-area-inset-top))]">
      {menu && (
        <div className="pointer-events-auto fixed inset-0 z-0" onClick={() => setMenu(false)} />
      )}

      <div className="pointer-events-auto relative z-30 flex items-center gap-1.5 rounded-2xl bg-white/95 p-1.5 shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur">
        {/* دکمه منو (و آیکون برنامه) */}
        <button
          onClick={() => setMenu((v) => !v)}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-white transition active:scale-95",
            menu ? "bg-slate-800 ring-2 ring-emerald-400" : "bg-slate-900"
          )}
          aria-label="منوی برنامه"
          title="منو"
        >
          {customIcon ? (
            <img src={customIcon} alt="سالار مپ" className="h-full w-full object-cover" />
          ) : (
            <MapPin className="h-5 w-5 text-emerald-400" />
          )}
        </button>

        {/* جستجو */}
        <div className="relative min-w-0 flex-1">
          <div className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-100 px-2.5 focus-within:ring-2 focus-within:ring-slate-900/15">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="جستجوی مکان…"
              className="h-full w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-slate-400"
            />
            {query && (
              <button
                onClick={() => onQuery("")}
                className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                aria-label="پاک کردن"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* نتایج زنده جستجو */}
          {showResults && (
            <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-[55vh] overflow-y-auto rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/10 animate-pop-in">
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

        {/* لیست مکان‌ها */}
        <button
          onClick={onOpenList}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 active:scale-95 hover:bg-slate-200"
          title="لیست مکان‌ها"
          aria-label="لیست مکان‌ها"
        >
          <List className="h-5 w-5" />
        </button>

        {/* منوی بازشو */}
        {menu && (
          <div className="absolute right-1.5 top-full z-30 mt-1.5 w-60 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 animate-pop-in">
            <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900">
                <MapPin className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-slate-900">سالار مپ</p>
                <p className="truncate text-[11px] text-slate-500">{toFa(allPlaces.length)} مکان روی نقشه</p>
              </div>
            </div>

            {onInstall && (
              <button
                onClick={() => {
                  setMenu(false);
                  onInstall();
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-right text-xs font-bold text-slate-800 hover:bg-slate-50"
              >
                <Download className="h-4 w-4 shrink-0 text-emerald-600" />
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
              className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-right text-xs font-bold text-slate-600 hover:bg-slate-50"
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
    </header>
  );
}
