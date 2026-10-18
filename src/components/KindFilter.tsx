import type { MarkerKind, Place } from "../types";
import { MARKER_TYPES } from "../data/mapConfig";
import { toFa } from "../utils/geo";

interface Props {
  places: Place[];
  value?: MarkerKind | "all";
  onChange?: (v: MarkerKind | "all") => void;
  dark?: boolean;
}

/** نمایش یکپارچه تعداد کل مکان‌ها با نشانگر سبز */
export default function KindFilter({ places }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm"
        style={{ background: MARKER_TYPES.green.color }}
      >
        <span className="h-2.5 w-2.5 rounded-full bg-white ring-2 ring-white/50" />
        همه مکان‌ها ({toFa(places.length)})
      </span>
    </div>
  );
}
