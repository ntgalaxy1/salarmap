import { useState } from "react";
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import type L from "leaflet";
import { Check, Crosshair, Home, Layers, Minus, Plus, X } from "lucide-react";
import type { LayerKey, Place } from "../../types";
import { DEFAULT_ZOOM, LAYERS, MARKER_TYPES, TABRIZ_CENTER } from "../../data/mapConfig";

interface Props {
  title: string;
  initial: { lat: number; lng: number } | null;
  layer: LayerKey;
  /** بقیه مکان‌ها برای نمایش کم‌رنگ (کمک به موقعیت‌یابی) */
  places: Place[];
  excludeId?: string;
  onConfirm: (lat: number, lng: number) => void;
  onCancel: () => void;
}

function CenterTracker({ onMove }: { onMove: (c: L.LatLng) => void }) {
  const map = useMapEvents({
    move: () => onMove(map.getCenter()),
  });
  return null;
}

/**
 * انتخاب موقعیت روی نقشه (تمام‌صفحه، مخصوص مدیر)
 * نشانگر وسط صفحه ثابت است؛ نقشه را حرکت دهید تا نشانگر روی مکان قرار گیرد.
 */
export default function LocationPicker({ title, initial, layer, places, excludeId, onConfirm, onCancel }: Props) {
  const start: [number, number] = initial ? [initial.lat, initial.lng] : TABRIZ_CENTER;
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: start[0], lng: start[1] });
  const [map, setMap] = useState<L.Map | null>(null);
  const [sat, setSat] = useState(layer === "satellite" || layer === "hybrid");
  const tile = LAYERS[sat ? "hybrid" : layer === "osm" ? "osm" : "google"];
  const maxZoom = tile.maxZoom ?? 20;

  return (
    <div className="fixed inset-0 z-[1280] bg-slate-200 animate-fade-in">
      <MapContainer
        center={start}
        zoom={initial ? 17 : 14}
        minZoom={3}
        maxZoom={maxZoom}
        zoomControl={false}
        className="absolute inset-0 z-0"
        ref={setMap}
      >
        <TileLayer
          key={tile.url}
          url={tile.url}
          subdomains={tile.subdomains}
          attribution={tile.attribution}
          maxZoom={maxZoom}
          maxNativeZoom={maxZoom}
        />
        <CenterTracker onMove={(c) => setCenter({ lat: c.lat, lng: c.lng })} />
        {places
          .filter((p) => p.id !== excludeId)
          .map((p) => (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={7}
              interactive={false}
              pathOptions={{ color: "#fff", weight: 2, fillColor: MARKER_TYPES[p.kind].color, fillOpacity: 0.85 }}
            />
          ))}
      </MapContainer>

      {/* راهنما */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center p-3 safe-top">
        <div className="flex items-center gap-2 rounded-2xl bg-slate-900/90 px-4 py-2.5 text-white shadow-xl backdrop-blur animate-pop-in">
          <Crosshair className="h-4 w-4 text-emerald-400" />
          <div>
            <p className="text-sm font-extrabold">{title}</p>
            <p className="text-[11px] text-slate-300">نقشه را حرکت دهید تا نشانگر روی مکان قرار گیرد</p>
          </div>
        </div>
      </div>

      {/* نشانگر وسط */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2">
        <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900 ring-2 ring-white" />
        <div className="absolute left-1/2 top-0 h-3 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/25 blur-[2px]" />
        <svg viewBox="0 0 24 24" className="absolute left-1/2 top-0 h-14 w-14 -translate-x-1/2 -translate-y-[calc(100%-2px)] drop-shadow-lg">
          <path d="M12 22s-7-6.6-7-12a7 7 0 0 1 14 0c0 5.4-7 12-7 12z" fill="#0f172a" stroke="#fff" strokeWidth="1.6" />
          <circle cx="12" cy="10" r="2.6" fill="#fff" />
        </svg>
      </div>

      {/* کنترل‌ها */}
      <div className="absolute left-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2">
        <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-900/10">
          <button onClick={() => map?.zoomIn()} className="flex h-11 w-11 items-center justify-center hover:bg-slate-100" aria-label="بزرگ‌نمایی">
            <Plus className="h-5 w-5" />
          </button>
          <div className="h-px bg-slate-200" />
          <button onClick={() => map?.zoomOut()} className="flex h-11 w-11 items-center justify-center hover:bg-slate-100" aria-label="کوچک‌نمایی">
            <Minus className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={() => map?.flyTo(TABRIZ_CENTER, DEFAULT_ZOOM, { duration: 0.8 })}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-slate-900/10 hover:bg-slate-100"
          title="بازگشت به مرکز تبریز"
          aria-label="بازگشت به مرکز تبریز"
        >
          <Home className="h-5 w-5" />
        </button>
        <button
          onClick={() => setSat((v) => !v)}
          className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg ring-1 ring-slate-900/10 ${sat ? "bg-slate-900 text-white" : "bg-white"}`}
          title="ماهواره‌ای / نقشه"
          aria-label="ماهواره‌ای / نقشه"
        >
          <Layers className="h-5 w-5" />
        </button>
      </div>

      {/* تأیید */}
      <div className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 md:left-1/2 md:right-auto md:w-[28rem] md:-translate-x-1/2">
        <div className="rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-slate-900/10 animate-sheet-up">
          <p className="mb-2 text-center font-mono text-xs text-slate-600" dir="ltr">
            {center.lat.toFixed(6)}, {center.lng.toFixed(6)}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
              <X className="h-4 w-4" />
              انصراف
            </button>
            <button
              onClick={() => onConfirm(+center.lat.toFixed(6), +center.lng.toFixed(6))}
              className="flex h-11 flex-[2] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700"
            >
              <Check className="h-4 w-4" />
              تأیید این موقعیت
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
