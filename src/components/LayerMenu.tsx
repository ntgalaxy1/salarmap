import { Check } from "lucide-react";
import type { LayerKey } from "../types";
import { LAYERS } from "../data/mapConfig";
import { cn } from "../utils/cn";

interface Props {
  value: LayerKey;
  onChange: (l: LayerKey) => void;
  onClose: () => void;
}

/** منوی انتخاب نوع نقشه (گوگل، ماهواره، ترکیبی، OSM) */
export default function LayerMenu({ value, onChange, onClose }: Props) {
  return (
    <>
      <div className="fixed inset-0 z-[1150]" onClick={onClose} />
      <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-16 z-[1160] w-64 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-slate-900/10 animate-pop-in">
        <p className="px-2 pb-1 pt-1 text-xs font-extrabold text-slate-500">
          نوع نقشه
        </p>
        {(Object.keys(LAYERS) as LayerKey[]).map((key) => {
          const l = LAYERS[key];
          const active = key === value;
          return (
            <button
              key={key}
              onClick={() => {
                onChange(key);
                onClose();
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-right transition",
                active ? "bg-slate-900 text-white" : "hover:bg-slate-100"
              )}
            >
              <span
                className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-black/10"
                style={{ background: l.preview }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{l.name}</span>
                <span
                  className={cn(
                    "block text-[11px]",
                    active ? "text-slate-300" : "text-slate-500"
                  )}
                >
                  {l.desc}
                </span>
              </span>
              {active && <Check className="h-4 w-4 shrink-0" />}
            </button>
          );
        })}
      </div>
    </>
  );
}
