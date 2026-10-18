import { Home, Layers, Minus, Plus } from "lucide-react";
import { cn } from "../utils/cn";

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onHome: () => void;
  onLayers: () => void;
  layersOpen: boolean;
  hidden?: boolean;
  className?: string;
}

/** دکمه‌های شناور روی نقشه (زوم، بازگشت به مرکز، لایه‌ها) */
export default function FloatingControls({
  onZoomIn,
  onZoomOut,
  onHome,
  onLayers,
  layersOpen,
  hidden,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "absolute left-3 z-[1100] flex flex-col gap-2 transition-opacity",
        "bottom-[max(1.5rem,env(safe-area-inset-bottom))]",
        hidden && "pointer-events-none opacity-0 md:pointer-events-auto md:opacity-100",
        className
      )}
    >
      <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-900/10">
        <Btn onClick={onZoomIn} label="بزرگ‌نمایی">
          <Plus className="h-5 w-5" />
        </Btn>
        <div className="h-px bg-slate-200" />
        <Btn onClick={onZoomOut} label="کوچک‌نمایی">
          <Minus className="h-5 w-5" />
        </Btn>
      </div>
      <Btn onClick={onHome} label="بازگشت به مرکز تبریز" className="rounded-2xl bg-white shadow-lg ring-1 ring-slate-900/10">
        <Home className="h-5 w-5" />
      </Btn>
      <Btn
        onClick={onLayers}
        label="تغییر نوع نقشه"
        className={cn(
          "rounded-2xl shadow-lg ring-1 ring-slate-900/10",
          layersOpen ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-white"
        )}
      >
        <Layers className="h-5 w-5" />
      </Btn>
    </div>
  );
}

function Btn({
  onClick,
  label,
  className,
  children,
}: {
  onClick: () => void;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center text-slate-800 transition hover:bg-slate-100 active:scale-95",
        className
      )}
    >
      {children}
    </button>
  );
}
