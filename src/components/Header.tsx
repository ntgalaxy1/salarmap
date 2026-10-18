import { useEffect, useState } from "react";
import { Download, HelpCircle, List, MapPin, MoreVertical, Search, ShieldCheck, X } from "lucide-react";
import type { MarkerKind, Place } from "../types";
import { BUILD_INFO } from "../buildInfo";
import { getCustomAppIcon } from "../lib/image";
import { toFa } from "../utils/geo";
import { cn } from "../utils/cn";
import { KindDot } from "./KindBadge";

interface Props {
  allPlaces: Place[];
  query: string;
  onQuery: (q: string) => void;
  kindFilter?: MarkerKind | "all";
  onKindFilter?: (k: MarkerKind | "all") => void;
  results: Place[];
  onPick: (id: string) => void;
  onOpenList: () => void;
  onOpenGuide: () => void;
  onAdminLogin: () => void;
  onInstall?: () => void;
}

/** هدر صفحه اصلی (نمای کاربر): عنوان و جستجو */
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
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[1100] p-2.5 safe-top md:left-0 md:right-auto md:w-[26rem]">
      {menu && <div className="pointer-events-auto fixed inset-0 z-0" onClick={() => setMenu(false)} />}

      <div className="pointer-events-auto relative rounded-2xl bg-white/95 shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur">
        {/* عنوان */}
        <div className="flex items-center gap-1.5 px-2.5 pt-2.5">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-900 text-white">
            {customIcon ? (
              <img src={customIcon} alt="سالار مپ" className="h-full w-full object-cover" />
            ) : (
              <>
                <MapPin className="h-4.5 w-4.5 text-emerald-400" />
                <KindDot kind="green" className="absolute -left-1 -top-1 h-2.5 w-2.5" />
              </>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-extrabold leading-tight text-slate-900">سالار مپ</h1>
            <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="truncate">{toFa(allPlaces.length)} مکان روی نقشه</span>
              {BUILD_INFO.number !== "dev" && (
                <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-bold text-slate-500">
                  نسخه {toFa(BUILD_INFO.number)}
                </span>
              )}
            </p>
          </div>
          {onInstall && (
            <button
              onClick={onInstall}
              className="flex h-9 shrink-0 items-center gap-1 rounded-xl bg-slate-900 px-2.5 text-[11px] font-bold text-white shadow hover:bg-slate-800"
              title="نصب برنامه روی گوشی"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">نصب</span>
            </button>
          )}
          <button
            onClick={onOpenList}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
            title="لیست مکان‌ها"
            aria-label="لیست مکان‌ها"
          >
            <List className="h-5 w-5" />
          </button>
          <button
            onClick={() => setMenu((v) => !v)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-200",
              menu ? "bg-slate-200" : "bg-slate-100"
            )}
            title="منو"
            aria-label="منو"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>

        {menu && (
          <div className="absolute left-3 top-14 z-20 w-56 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 animate-pop-in">
            <button
              onClick={() => {
                setMenu(false);
                onOpenGuide();
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-right text-sm font-bold text-slate-800 hover:bg-slate-50"
            >
              <HelpCircle className="h-4 w-4 text-slate-500" />
              راهنما
            </button>
            <button
              onClick={() => {
                setMenu(false);
                onAdminLogin();
              }}
              className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-right text-sm font-bold text-slate-800 hover:bg-slate-50"
            >
              <ShieldCheck className="h-4 w-4 text-slate-500" />
              ورود به مدیریت
            </button>
          </div>
        )}

        {/* جستجو */}
        <div className="relative px-2.5 pt-2.5">
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-2.5 focus-within:ring-2 focus-within:ring-slate-900/20">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="جستجوی مکان…"
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            {query && (
              <button
                onClick={() => onQuery("")}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                aria-label="پاک کردن"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {showResults && (
            <div className="absolute inset-x-2.5 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/10 animate-pop-in">
              {results.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-500">موردی پیدا نشد.</p>
              ) : (
                results.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onPick(p.id)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-right hover:bg-slate-50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <KindDot kind={p.kind} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-900">{p.name}</span>
                      <span className="block truncate text-xs text-slate-500">{p.short}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* فاصله پایین جستجو */}
        <div className="pb-2.5" />
      </div>
    </header>
  );
}
