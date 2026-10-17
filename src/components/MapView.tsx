import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { FlyTarget, LayerKey, MarkerKind, Place } from "../types";
import { DEFAULT_ZOOM, LAYERS, TABRIZ_CENTER } from "../data/mapConfig";

interface Props {
  places: Place[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  layer: LayerKey;
  flyTarget: FlyTarget | null;
  onMapReady: (map: L.Map | null) => void;
}

/** آیکون نشانگر رنگی (HTML خالص، بدون تصویر) */
function makeDotIcon(kind: MarkerKind, active: boolean) {
  const size = active ? 40 : 30;
  return L.divIcon({
    className: "dot-wrap",
    html: `<span class="dot dot--${kind} ${active ? "dot--active" : ""}" role="button"><i class="ring"></i><i class="core"></i></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [0, -size / 2 + 4],
  });
}

/** پرواز نرم دوربین به سمت نقطه انتخاب‌شده */
function FlyController({ target }: { target: FlyTarget | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    const zoom = target.zoom ?? Math.max(map.getZoom(), 16);
    const point = map.project([target.lat, target.lng], zoom);
    if (target.offset !== false) {
      if (window.innerWidth < 768) point.y += window.innerHeight * 0.2;
      else point.x += 210;
    }
    map.flyTo(map.unproject(point, zoom), zoom, { duration: 0.9 });
  }, [target, map]);
  return null;
}

function MapEvents({ onClick, onZoom }: { onClick: () => void; onZoom: (z: number) => void }) {
  useMapEvents({
    click: () => onClick(),
    zoomend: (e) => onZoom((e.target as L.Map).getZoom()),
  });
  return null;
}

export default function MapView({ places, selectedId, onSelect, layer, flyTarget, onMapReady }: Props) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const icons = useMemo(
    () => ({
      green: { normal: makeDotIcon("green", false), active: makeDotIcon("green", true) },
    }),
    []
  );
  const tile = LAYERS[layer];
  const maxZoom = tile.maxZoom ?? 20;
  const showLabels = zoom >= 16;

  return (
    <MapContainer
      center={TABRIZ_CENTER}
      zoom={DEFAULT_ZOOM}
      minZoom={3}
      maxZoom={maxZoom}
      zoomControl={false}
      attributionControl={true}
      className="absolute inset-0 z-0"
      ref={onMapReady}
    >
      <TileLayer
        key={layer}
        url={tile.url}
        subdomains={tile.subdomains}
        attribution={tile.attribution}
        maxZoom={maxZoom}
        maxNativeZoom={maxZoom}
      />

      <MapEvents onClick={() => onSelect(null)} onZoom={setZoom} />
      <FlyController target={flyTarget} />

      {places.map((p) => {
        const active = p.id === selectedId;
        const set = icons.green;
        return (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={active ? set.active : set.normal}
            zIndexOffset={active ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(p.id) }}
          >
            <Tooltip
              key={showLabels || active ? "perm" : "hover"}
              permanent={showLabels || active}
              direction="top"
              className="place-label"
              opacity={1}
            >
              {p.name}
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
