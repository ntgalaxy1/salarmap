import type { MarkerKind } from "../types";
import { MARKER_TYPES } from "../data/mapConfig";
import { cn } from "../utils/cn";

/** نشان کوچک سبز مکان */
export default function KindBadge({
  className,
  size = "sm",
}: {
  kind?: MarkerKind;
  className?: string;
  size?: "sm" | "md";
}) {
  const t = MARKER_TYPES.green;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-bold text-white",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className
      )}
      style={{ background: t.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
      مکان ثبت‌شده
    </span>
  );
}

/** دایره سبز یکپارچه */
export function KindDot({ className }: { kind?: MarkerKind; className?: string }) {
  return (
    <span
      className={cn("inline-block h-3 w-3 rounded-full ring-2 ring-white shadow", className)}
      style={{ background: MARKER_TYPES.green.color }}
    />
  );
}
