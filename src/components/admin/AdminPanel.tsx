import { useMemo, useState } from "react";
import type L from "leaflet";
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  Eye,
  List,
  Loader2,
  LogOut,
  Map as MapIcon,
  MapPin,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import type { AdminPrefs, EditorState, FlyTarget, LayerKey, MarkerKind, PickRequest, Place } from "../../types";
import type { AdminApi } from "../../hooks/useAdmin";
import type { PlacesApi } from "../../hooks/usePlaces";
import { DEFAULT_ZOOM, TABRIZ_CENTER } from "../../data/mapConfig";
import { describeError } from "../../lib/github";
import { uid } from "../../lib/storage";
import { matchesPlace } from "../../utils/search";
import { toFa } from "../../utils/geo";
import { cn } from "../../utils/cn";
import MapView from "../MapView";
import FloatingControls from "../FloatingControls";
import LayerMenu from "../LayerMenu";
import PlaceSheet from "../PlaceSheet";
import KindBadge from "../KindBadge";
import KindFilter from "../KindFilter";
import PlaceEditor from "./PlaceEditor";
import LocationPicker from "./LocationPicker";
import AdminSettingsTab from "./AdminSettingsTab";
import CatalogModal from "./CatalogModal";

interface Props {
  admin: AdminApi;
  store: PlacesApi;
  layer: LayerKey;
  onLayer: (l: LayerKey) => void;
  prefs: AdminPrefs;
  onPrefs: (p: AdminPrefs) => void;
  onViewAsUser: () => void;
  onLogout: () => void;
  onGuide: () => void;
  onToast: (msg: string) => void;
}

type Tab = "places" | "map" | "settings";

const newPlace = (lat: number, lng: number): Place => ({
  id: `p-${uid()}`,
  name: "",
  kind: "green",
  lat,
  lng,
  short: "",
  description: "",
  images: [],
});

/** پنل مدیریت تمام‌صفحه: مکان‌ها (جستجو/افزودن/ویرایش/حذف)، نقشه، تنظیمات */
export default function AdminPanel({
  admin,
  store,
  layer,
  onLayer,
  prefs,
  onPrefs,
  onViewAsUser,
  onLogout,
  onGuide,
  onToast,
}: Props) {
  const session = admin.session!;
  const [tab, setTab] = useState<Tab>("places");
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<MarkerKind | "all">("all");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [picker, setPicker] = useState<PickRequest | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);

  // نقشه
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);

  const places = store.places;
  const filtered = useMemo(
    () => places.filter((p) => (kindFilter === "all" || p.kind === kindFilter) && matchesPlace(p, query)),
    [places, kindFilter, query]
  );
  const selected = places.find((p) => p.id === selectedId) ?? null;
  const rawOf = (id: string) => store.rawPlaces.find((p) => p.id === id) ?? null;

  const flyTo = (lat: number, lng: number, extra?: Partial<FlyTarget>) =>
    setFlyTarget({ lat, lng, nonce: Date.now(), ...extra });

  // ── عملیات ذخیره در پیش‌نویس (قبل از انتشار نهایی)
  const startAdd = () => {
    setSelectedId(null);
    setPicker({ kind: "new" });
  };
  const startEdit = (id: string) => {
    const raw = rawOf(id);
    if (!raw) return;
    setEditor({ place: { ...raw, images: [...raw.images] }, pending: [], isNew: false });
    setSelectedId(null);
  };
  const startMove = (id: string) => {
    setPicker({ kind: "move", id });
    setSelectedId(null);
  };
  const remove = (id: string) => {
    store.removePlace(id);
    if (selectedId === id) setSelectedId(null);
    onToast("مکان از پیش‌نویس حذف شد — برای اعمال عمومی، «تأیید و انتشار نهایی» را بزنید.");
  };
  const showOnMap = (id: string) => {
    const p = places.find((x) => x.id === id);
    if (!p) return;
    setTab("map");
    setSelectedId(id);
    flyTo(p.lat, p.lng);
  };

  const pickerInitial = (): { lat: number; lng: number } | null => {
    if (!picker) return null;
    if (picker.kind === "move") {
      const r = rawOf(picker.id);
      return r ? { lat: r.lat, lng: r.lng } : null;
    }
    if (picker.kind === "editor" && editor && Number.isFinite(editor.place.lat)) {
      return { lat: editor.place.lat, lng: editor.place.lng };
    }
    if (map) {
      const c = map.getCenter();
      return { lat: c.lat, lng: c.lng };
    }
    return null;
  };

  const confirmPick = (lat: number, lng: number) => {
    const req = picker;
    setPicker(null);
    if (!req) return;
    if (req.kind === "new") {
      setEditor({ place: newPlace(lat, lng), pending: [], isNew: true });
    } else if (req.kind === "move") {
      store.movePlace(req.id, lat, lng);
      onToast("موقعیت جدید ذخیره شد — برای اعمال عمومی، «تأیید و انتشار نهایی» را بزنید.");
      if (tab === "map") {
        setSelectedId(req.id);
        flyTo(lat, lng);
      }
    } else {
      setEditor((e) => (e ? { ...e, place: { ...e.place, lat, lng } } : e));
    }
  };

  const saveEditor = () => {
    if (!editor) return;
    const p = editor.place;
    const place: Place = {
      ...p,
      name: p.name.trim(),
      short: p.short.trim(),
      description: p.description.trim(),
      address: p.address?.trim() || undefined,
      phone: p.phone?.trim() || undefined,
      hours: p.hours?.trim() || undefined,
      website: p.website?.trim() || undefined,
      nameEn: p.nameEn?.trim() || undefined,
    };
    store.upsertPlace(place, editor.pending);
    setEditor(null);
    onToast(
      (editor.isNew ? "مکان جدید ذخیره شد" : "تغییرات ذخیره شد") +
        " — برای انتشار عمومی، روی «تأیید و انتشار نهایی» بزنید."
    );
  };

  const handleConfirmPublish = async () => {
    setPublishing(true);
    try {
      await store.publish({ rebuildAndroid: prefs.rebuildAndroid });
      setConfirmPublishOpen(false);
      onToast("تغییرات با موفقیت منتشر شد.");
    } catch (e) {
      onToast("❌ " + describeError(e));
    } finally {
      setPublishing(false);
    }
  };

  const overlay = Boolean(editor || picker);
  const hasPendingChanges = store.changeCount > 0;

  return (
    <div className="flex h-dvh flex-col bg-slate-100">
      {/* هدر */}
      <header className="shrink-0 bg-slate-900 text-white shadow-lg">
        <div className="flex items-center gap-2 px-3 pb-2 safe-top sm:gap-3 sm:px-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-extrabold leading-tight sm:text-base">مدیریت سالار مپ</h1>
            <p className="truncate text-[11px] text-slate-300">
              <span dir="ltr">{session.username}</span>
              {" · "}
              {toFa(places.length)} مکان
            </p>
          </div>
          <button
            onClick={() => setCatalogOpen(true)}
            className="flex h-9 shrink-0 items-center gap-1 rounded-xl bg-emerald-500 px-2.5 text-[11px] font-extrabold text-white shadow hover:bg-emerald-400 sm:text-xs"
            title="گرفتن خروجی کاتالوگ تصویری (عکس)"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">کاتالوگ</span>
          </button>
          <button
            onClick={onGuide}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-200 hover:bg-white/20"
            title="راهنمای برنامه"
            aria-label="راهنمای برنامه"
          >
            <BookOpen className="h-4 w-4" />
          </button>
          <button
            onClick={onViewAsUser}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
            title="مشاهده برنامه از دید کاربر"
            aria-label="مشاهده برنامه از دید کاربر"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={onLogout}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
            title="خروج"
            aria-label="خروج"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex px-2">
          {(
            [
              { key: "places", label: "مکان‌ها", icon: <List className="h-4 w-4" /> },
              { key: "map", label: "نقشه", icon: <MapIcon className="h-4 w-4" /> },
              { key: "settings", label: "تنظیمات", icon: <Settings className="h-4 w-4" /> },
            ] as { key: Tab; label: string; icon: React.ReactNode }[]
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-bold transition",
                tab === t.key ? "border-emerald-400 text-white" : "border-transparent text-slate-400 hover:text-white"
              )}
            >
              {t.icon}
              {t.label}
              {t.key === "settings" && session.isDefault && <span className="h-2 w-2 rounded-full bg-amber-400" />}
            </button>
          ))}
        </nav>
      </header>

      {/* محتوا */}
      <main className="relative flex-1 overflow-hidden">
        {tab === "places" && (
          <div className="flex h-full flex-col">
            {/* جستجو و فیلتر */}
            <div className="shrink-0 space-y-2 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 focus-within:ring-2 focus-within:ring-slate-900/20">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجو برای ویرایش… (نام، توضیح، آدرس)"
                  className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
                {query && (
                  <button onClick={() => setQuery("")} className="rounded-full p-1 text-slate-400 hover:bg-slate-200" aria-label="پاک کردن">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <KindFilter places={places} value={kindFilter} onChange={setKindFilter} />
                <button
                  type="button"
                  onClick={() => setCatalogOpen(true)}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-white shadow hover:bg-slate-800"
                >
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  خروجی کاتالوگ
                </button>
              </div>
            </div>

            {/* لیست */}
            <div className="flex-1 overflow-y-auto px-4 py-3 pb-40">
              {!store.draftReady && store.loading && places.length === 0 ? (
                <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> در حال بارگذاری…
                </p>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center">
                  <MapPin className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-2 text-sm font-bold text-slate-600">
                    {places.length === 0 ? "هنوز مکانی ثبت نشده" : "مکانی با این جستجو پیدا نشد"}
                  </p>
                  {places.length === 0 && (
                    <button onClick={startAdd} className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">
                      افزودن اولین مکان
                    </button>
                  )}
                </div>
              ) : (
                <ul className="mx-auto max-w-2xl space-y-2">
                  {filtered.map((p) => (
                    <AdminPlaceRow
                      key={p.id}
                      place={p}
                      onEdit={() => startEdit(p.id)}
                      onDelete={() => remove(p.id)}
                      onShow={() => showOnMap(p.id)}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* دکمه شناور افزودن مکان */}
            <button
              onClick={startAdd}
              className="absolute bottom-6 left-4 z-10 flex h-13 items-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-extrabold text-white shadow-2xl shadow-slate-900/30 hover:bg-slate-800 active:scale-95"
            >
              <Plus className="h-5 w-5 text-emerald-400" />
              افزودن مکان جدید
            </button>
          </div>
        )}

        {tab === "map" && (
          <div className="absolute inset-0">
            <MapView
              places={filtered}
              selectedId={selectedId}
              onSelect={setSelectedId}
              layer={layer}
              flyTarget={flyTarget}
              onMapReady={setMap}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[1100] p-3">
              <div className="pointer-events-auto mx-auto flex max-w-xl items-center gap-2 rounded-2xl bg-white/95 p-2 shadow-lg ring-1 ring-slate-900/5 backdrop-blur">
                <Search className="mr-1 h-4 w-4 shrink-0 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجو روی نقشه…"
                  className="h-9 w-full bg-transparent text-sm outline-none"
                />
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                  {toFa(filtered.length)} مکان
                </span>
              </div>
            </div>
            <FloatingControls
              onZoomIn={() => map?.zoomIn()}
              onZoomOut={() => map?.zoomOut()}
              onHome={() => {
                setSelectedId(null);
                map?.flyTo(TABRIZ_CENTER, DEFAULT_ZOOM, { duration: 0.8 });
              }}
              onLayers={() => setLayerMenuOpen((v) => !v)}
              layersOpen={layerMenuOpen}
              hidden={Boolean(selected)}
              className="bottom-6"
            />
            {layerMenuOpen && <LayerMenu value={layer} onChange={onLayer} onClose={() => setLayerMenuOpen(false)} />}
            {!selected && (
              <button
                onClick={startAdd}
                className="absolute bottom-6 right-4 z-[1100] flex h-13 items-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-extrabold text-white shadow-2xl shadow-slate-900/30 hover:bg-slate-800 active:scale-95"
              >
                <Plus className="h-5 w-5 text-emerald-400" />
                افزودن مکان جدید
              </button>
            )}
            {selected && !overlay && (
              <PlaceSheet
                place={selected}
                onClose={() => setSelectedId(null)}
                onToast={onToast}
                admin={{
                  onEdit: () => startEdit(selected.id),
                  onMove: () => startMove(selected.id),
                  onDelete: () => remove(selected.id),
                }}
              />
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="h-full overflow-y-auto">
            <AdminSettingsTab admin={admin} store={store} prefs={prefs} onPrefs={onPrefs} onToast={onToast} onGuide={onGuide} />
          </div>
        )}
      </main>

      {/* نوار ثابت پایین صفحه مدیریت با دکمه «تأیید و انتشار نهایی» */}
      {!overlay && (
        <footer className="shrink-0 border-t border-slate-200/90 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur">
          {store.draftVolatile && (
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              حافظه مرورگر محدود است؛ لطفاً پس از اتمام ویرایش، تغییرات را منتشر کنید.
            </p>
          )}
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {hasPendingChanges ? (
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold text-slate-900">
                      {toFa(store.changeCount)} تغییر ذخیره شده (در انتظار انتشار)
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      تا زمان تأیید نهایی، تغییرات برای کاربران نمایش داده نمی‌شود
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-700">
                      همه تغییرات منتشر شده است
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      ابتدا مکان‌ها را ویرایش و ذخیره کنید، سپس انتشار نهایی را بزنید
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setConfirmPublishOpen(true)}
              disabled={!hasPendingChanges || publishing}
              className={cn(
                "relative flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl px-5 text-xs font-extrabold transition-all",
                hasPendingChanges
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 active:scale-[0.98]"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              <span>تأیید و انتشار نهایی</span>
              {hasPendingChanges && !publishing && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/25 px-1.5 text-[11px] font-extrabold text-white">
                  {toFa(store.changeCount)}
                </span>
              )}
            </button>
          </div>
        </footer>
      )}

      {/* پنجره تأیید انتشار نهایی */}
      {confirmPublishOpen && (
        <div className="fixed inset-0 z-[1450] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] animate-fade-in"
            onClick={() => !publishing && setConfirmPublishOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 text-center shadow-2xl ring-1 ring-slate-900/10 animate-pop-in"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h3 className="mt-4 text-base font-extrabold leading-relaxed text-slate-900">
              آیا از انتشار نهایی این تغییرات مطمئن هستید؟
            </h3>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              با تأیید این گزینه، {toFa(store.changeCount)} تغییر ذخیره‌شده به‌صورت نهایی در برنامه اعمال و برای کاربران
              منتشر خواهد شد.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={publishing}
                onClick={() => setConfirmPublishOpen(false)}
                className="flex h-11 items-center justify-center rounded-2xl bg-slate-100 text-xs font-extrabold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={publishing}
                onClick={() => void handleConfirmPublish()}
                className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {publishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    در حال انتشار…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    تأیید و انتشار
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* پنجره‌های انتخاب موقعیت، ویرایش مکان و کاتالوگ */}
      {picker && (
        <LocationPicker
          title={picker.kind === "new" ? "موقعیت مکان جدید" : picker.kind === "move" ? "جابه‌جایی مکان" : "انتخاب موقعیت"}
          initial={pickerInitial()}
          layer={layer}
          places={places}
          excludeId={picker.kind === "move" ? picker.id : editor?.place.id}
          onConfirm={confirmPick}
          onCancel={() => setPicker(null)}
        />
      )}
      {editor && !picker && (
        <PlaceEditor
          state={editor}
          onChange={setEditor}
          resolveImage={store.resolveImage}
          onPickLocation={() => setPicker({ kind: "editor" })}
          onSave={saveEditor}
          onCancel={() => setEditor(null)}
          onToast={onToast}
        />
      )}
      {catalogOpen && (
        <CatalogModal
          places={filtered.length > 0 ? filtered : places}
          initialFilter={kindFilter}
          onClose={() => setCatalogOpen(false)}
          onToast={onToast}
        />
      )}
    </div>
  );
}

/* ───────────── ردیف لیست مدیر ───────────── */
function AdminPlaceRow({
  place,
  onEdit,
  onDelete,
  onShow,
}: {
  place: Place;
  onEdit: () => void;
  onDelete: () => void;
  onShow: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <li className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md">
      <div className="flex items-center gap-3 p-3">
        <button onClick={onShow} className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-200" title="نمایش روی نقشه">
          {place.images[0] ? (
            <img src={place.images[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-slate-400">
              <MapPin className="h-5 w-5" />
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <KindBadge kind={place.kind} />
          <p className="mt-1 truncate text-sm font-bold text-slate-900">{place.name || "بدون نام"}</p>
          <p className="truncate text-xs text-slate-500">{place.short || "—"}</p>
          <p className="mt-0.5 font-mono text-[10px] text-slate-400" dir="ltr">
            {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-x-reverse divide-slate-100 border-t border-slate-100 text-xs font-bold">
        <button onClick={onEdit} className="flex items-center justify-center gap-1 py-2.5 text-slate-800 hover:bg-slate-50">
          <Pencil className="h-3.5 w-3.5" />
          ویرایش
        </button>
        <button onClick={onShow} className="flex items-center justify-center gap-1 py-2.5 text-slate-800 hover:bg-slate-50">
          <MapIcon className="h-3.5 w-3.5" />
          روی نقشه
        </button>
        <button
          onClick={() => {
            if (!confirm) {
              setConfirm(true);
              setTimeout(() => setConfirm(false), 3000);
              return;
            }
            onDelete();
          }}
          className={cn(
            "flex items-center justify-center gap-1 py-2.5 transition",
            confirm ? "bg-red-600 text-white" : "text-red-600 hover:bg-red-50"
          )}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {confirm ? "مطمئنید؟" : "حذف"}
        </button>
      </div>
    </li>
  );
}
