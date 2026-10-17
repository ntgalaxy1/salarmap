import { useCallback, useEffect, useMemo, useState } from "react";
import type L from "leaflet";
import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import type { AdminPrefs, BeforeInstallPromptEvent, FlyTarget, LayerKey, MarkerKind } from "./types";
import { DEFAULT_ZOOM, TABRIZ_CENTER } from "./data/mapConfig";
import { toFa } from "./utils/geo";
import { matchesPlace } from "./utils/search";
import { KEYS, readJSON, writeJSON } from "./lib/storage";
import { useAdmin } from "./hooks/useAdmin";
import { usePlaces } from "./hooks/usePlaces";
import MapView from "./components/MapView";
import Header from "./components/Header";
import FloatingControls from "./components/FloatingControls";
import LayerMenu from "./components/LayerMenu";
import PlaceSheet from "./components/PlaceSheet";
import PlacesList from "./components/PlacesList";
import GuideModal from "./components/GuideModal";
import AdminLogin from "./components/admin/AdminLogin";
import AdminPanel from "./components/admin/AdminPanel";

export default function App() {
  // ── داده و مدیر
  const admin = useAdmin();
  const store = usePlaces(admin.session);

  // ── مشترک
  const [layer, setLayer] = useState<LayerKey>("google");
  const [guideOpen, setGuideOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [prefs, setPrefsState] = useState<AdminPrefs>(() => readJSON<AdminPrefs>(KEYS.prefs, { rebuildAndroid: false }));
  const setPrefs = (p: AdminPrefs) => {
    setPrefsState(p);
    writeJSON(KEYS.prefs, p);
  };

  // ── مدیریت
  const [adminView, setAdminView] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);

  // ── نمای کاربر
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<MarkerKind | "all">("all");
  const [listOpen, setListOpen] = useState(false);
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);
  const [map, setMap] = useState<L.Map | null>(null);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);

  // در نمای کاربر فقط مکان‌های منتشرشده نهایی نمایش داده می‌شوند (تغییرات پیش‌نویس تا قبل از «تأیید و انتشار نهایی» منتشر نمی‌شوند)
  const places = store.publishedPlaces;
  const filtered = useMemo(
    () => places.filter((p) => (kindFilter === "all" || p.kind === kindFilter) && matchesPlace(p, query)),
    [places, kindFilter, query]
  );
  const selected = places.find((p) => p.id === selectedId) ?? null;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const selectPlace = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      if (id) {
        const p = places.find((x) => x.id === id);
        if (p) setFlyTarget({ lat: p.lat, lng: p.lng, nonce: Date.now() });
        setListOpen(false);
      }
    },
    [places]
  );

  const pickFromSearch = (id: string) => {
    setQuery("");
    selectPlace(id);
  };

  const goHome = () => {
    setSelectedId(null);
    map?.flyTo(TABRIZ_CENTER, DEFAULT_ZOOM, { duration: 0.8 });
  };

  // ── نصب PWA
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    const installed = () => setInstallEvt(null);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const installApp = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    const { outcome } = await installEvt.userChoice;
    if (outcome === "accepted") {
      showToast("برنامه نصب شد 🎉");
      setInstallEvt(null);
    }
  };

  // ── ورود مدیریت با آدرس #admin
  useEffect(() => {
    const check = () => {
      if (window.location.hash === "#admin") {
        if (admin.isAdmin) setAdminView(true);
        else setLoginOpen(true);
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [admin.isAdmin]);

  const logout = () => {
    admin.logout();
    setAdminView(true);
    setSelectedId(null);
    showToast("از بخش مدیریت خارج شدید");
  };

  // ── Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (layerMenuOpen) setLayerMenuOpen(false);
      else if (listOpen) setListOpen(false);
      else if (selectedId) setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [layerMenuOpen, listOpen, selectedId]);

  const showAdminPanel = admin.isAdmin && adminView;

  return (
    <>
      {showAdminPanel ? (
        <AdminPanel
          admin={admin}
          store={store}
          layer={layer}
          onLayer={setLayer}
          prefs={prefs}
          onPrefs={setPrefs}
          onViewAsUser={() => setAdminView(false)}
          onLogout={logout}
          onGuide={() => setGuideOpen(true)}
          onToast={showToast}
        />
      ) : (
        <div className="relative h-dvh w-full overflow-hidden bg-slate-200">
          <MapView
            places={filtered}
            selectedId={selectedId}
            onSelect={selectPlace}
            layer={layer}
            flyTarget={flyTarget}
            onMapReady={setMap}
          />

          <Header
            allPlaces={places}
            query={query}
            onQuery={setQuery}
            kindFilter={kindFilter}
            onKindFilter={setKindFilter}
            results={filtered}
            onPick={pickFromSearch}
            onOpenList={() => setListOpen(true)}
            onOpenGuide={() => setGuideOpen(true)}
            onAdminLogin={() => (admin.isAdmin ? setAdminView(true) : setLoginOpen(true))}
            onInstall={installEvt ? installApp : undefined}
          />

          <FloatingControls
            onZoomIn={() => map?.zoomIn()}
            onZoomOut={() => map?.zoomOut()}
            onHome={goHome}
            onLayers={() => setLayerMenuOpen((v) => !v)}
            layersOpen={layerMenuOpen}
            hidden={Boolean(selected)}
          />

          {layerMenuOpen && <LayerMenu value={layer} onChange={setLayer} onClose={() => setLayerMenuOpen(false)} />}

          {/* بازگشت به مدیریت (وقتی مدیر در حال دیدن نمای کاربر است) */}
          {admin.isAdmin && !selected && (
            <button
              onClick={() => setAdminView(true)}
              className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-3 z-[1100] flex h-11 items-center gap-1.5 rounded-2xl bg-slate-900 px-4 text-xs font-extrabold text-white shadow-xl hover:bg-slate-800"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              بازگشت به مدیریت
            </button>
          )}

          {/* وضعیت */}
          {!selected && (
            <div className="pointer-events-none absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-[1050] flex justify-center">
              {store.loading && places.length === 0 ? (
                <span className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-1.5 text-xs font-bold text-slate-700 shadow-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال دریافت مکان‌ها…
                </span>
              ) : store.error && places.length === 0 ? (
                <button
                  onClick={() => void store.reload()}
                  className="pointer-events-auto flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold text-white shadow-lg"
                >
                  <RefreshCw className="h-4 w-4" />
                  {store.error} — تلاش مجدد
                </button>
              ) : kindFilter !== "all" || query ? (
                <span className="rounded-full bg-slate-900/85 px-4 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur">
                  {filtered.length === 0 ? "مکانی پیدا نشد" : `${toFa(filtered.length)} مکان روی نقشه`}
                </span>
              ) : null}
            </div>
          )}

          {selected && <PlaceSheet place={selected} onClose={() => setSelectedId(null)} onToast={showToast} />}

          {listOpen && (
            <PlacesList places={filtered} selectedId={selectedId} onPick={selectPlace} onClose={() => setListOpen(false)} />
          )}

          {loginOpen && !admin.isAdmin && (
            <AdminLogin
              config={admin.config}
              loadConfig={admin.loadConfig}
              onLogin={admin.login}
              onSuccess={(s) => {
                setLoginOpen(false);
                setAdminView(true);
                showToast(`خوش آمدید ${s.username}`);
              }}
              onClose={() => setLoginOpen(false)}
              onOpenGuide={() => {
                setLoginOpen(false);
                setGuideOpen(true);
              }}
            />
          )}
        </div>
      )}

      {guideOpen && (
        <GuideModal
          onClose={() => setGuideOpen(false)}
          onInstall={installEvt ? installApp : undefined}
          isAdmin={admin.isAdmin}
          onAdminLogin={() => {
            setGuideOpen(false);
            if (admin.isAdmin) setAdminView(true);
            else setLoginOpen(true);
          }}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[1500] flex justify-center px-4 md:top-auto md:bottom-8">
          <div className="max-w-md rounded-2xl bg-slate-900 px-4 py-2 text-center text-sm font-bold leading-6 text-white shadow-2xl animate-pop-in">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
