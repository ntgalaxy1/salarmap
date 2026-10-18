import { ChevronLeft, X } from "lucide-react";
import type { Place } from "../types";
import { toFa } from "../utils/geo";
import KindBadge from "./KindBadge";

interface Props {
  places: Place[];
  selectedId: string | null;
  onPick: (id: string) => void;
  onClose: () => void;
}

/** لیست کشویی مکان‌ها (نمای کاربر) */
export default function PlacesList({ places, selectedId, onPick, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[1300]">
      <div className="absolute inset-0 bg-slate-900/40 animate-fade-in" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-white shadow-2xl animate-panel-in">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 safe-top">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">مکان‌ها</h2>
            <p className="text-[11px] text-slate-500">{toFa(places.length)} مکان</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
            aria-label="بستن"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
          {places.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-slate-500">مکانی پیدا نشد.</li>
          )}
          {places.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => onPick(p.id)}
                className={`flex w-full items-center gap-3 px-3 py-3 text-right transition hover:bg-slate-50 ${
                  selectedId === p.id ? "bg-slate-100" : ""
                }`}
              >
                <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                  {p.images[0] ? (
                    <img src={p.images[0]} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">—</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <KindBadge kind={p.kind} />
                  <p className="mt-1 truncate text-sm font-bold text-slate-900">{p.name}</p>
                  <p className="truncate text-xs text-slate-500">{p.short}</p>
                </div>
                <ChevronLeft className="h-4 w-4 shrink-0 text-slate-300" />
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
