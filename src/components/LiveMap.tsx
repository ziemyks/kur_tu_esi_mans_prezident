"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./LiveMap.css";
import type { Activity, GeoGuess } from "@/lib/types";

export type LiveMapProps = {
  lastKnown?: Activity & { geo: GeoGuess };
  activities: Activity[];
};

type GeoActivity = Activity & { geo: GeoGuess };

const LATVIA_CENTER: L.LatLngTuple = [56.95, 24.6];
const LATVIA_ZOOM = 7;

function isInLatvia(lat: number, lng: number): boolean {
  return lat >= 55.6 && lat <= 58.1 && lng >= 20.9 && lng <= 28.3;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : "#";
  } catch {
    return "#";
  }
}

const dateFmt = new Intl.DateTimeFormat("lv-LV", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFmt.format(d);
}

function popupHtml(a: GeoActivity, isLatest: boolean): string {
  const pct = Math.round(Math.max(0, Math.min(1, a.geo.confidence)) * 100);
  const date = formatDate(a.publishedAt);
  return `
    <div class="map-popup">
      ${isLatest ? '<div class="map-popup__badge">Pēdējā zināmā atrašanās vieta</div>' : ""}
      <div class="map-popup__place">${escapeHtml(a.geo.name)}</div>
      <a class="map-popup__title" href="${escapeHtml(safeUrl(a.link))}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.title)}</a>
      <div class="map-popup__meta">
        ${date ? `<span>${escapeHtml(date)}</span>` : ""}
        <span>${escapeHtml(a.source)}</span>
      </div>
      <div class="map-popup__conf">Precizitāte: ${pct}%</div>
    </div>
  `;
}

const fireIcon = L.divIcon({
  className: "fire-marker",
  iconSize: [96, 96],
  iconAnchor: [48, 64],
  popupAnchor: [0, -58],
  html: `
    <div class="fire-marker__wrap" aria-label="Pēdējā zināmā atrašanās vieta">
      <span class="fire-marker__ring fire-marker__ring--1"></span>
      <span class="fire-marker__ring fire-marker__ring--2"></span>
      <span class="fire-marker__ring fire-marker__ring--3"></span>
      <span class="fire-marker__glow"></span>
      <div class="fire-marker__flames">
        <span class="fire-marker__flame fire-marker__flame--red"></span>
        <span class="fire-marker__flame fire-marker__flame--orange"></span>
        <span class="fire-marker__flame fire-marker__flame--yellow"></span>
        <span class="fire-marker__flame fire-marker__flame--white"></span>
      </div>
      <span class="fire-marker__spark fire-marker__spark--1"></span>
      <span class="fire-marker__spark fire-marker__spark--2"></span>
      <span class="fire-marker__spark fire-marker__spark--3"></span>
      <span class="fire-marker__emoji" aria-hidden="true">🔥</span>
      <span class="fire-marker__base"></span>
    </div>
  `,
});

export default function LiveMap({ lastKnown, activities }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // Create map once.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      center: LATVIA_CENTER,
      zoom: LATVIA_ZOOM,
      zoomControl: true,
      maxZoom: 16,
      worldCopyJump: true,
    });
    // Esri dark gray canvas (no API key needed) + label overlay.
    const esri = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";
    L.tileLayer(`${esri}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
      attribution:
        'Tiles &copy; <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a> &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      maxZoom: 16,
    }).addTo(map);
    L.tileLayer(`${esri}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 16,
      pane: "overlayPane",
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Parent may size itself after mount.
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Render markers / trail whenever data changes.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const geoActs = activities
      .filter((a): a is GeoActivity => !!a.geo)
      .filter((a) => !lastKnown || a.id !== lastKnown.id)
      .sort(
        (a, b) =>
          new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
      );

    const now = Date.now();
    const maxAgeMs = 30 * 24 * 3600 * 1000;

    // Trail: chronological, ending at latest.
    const trailPts: L.LatLngTuple[] = geoActs.map((a) => [a.geo.lat, a.geo.lng]);
    if (lastKnown) trailPts.push([lastKnown.geo.lat, lastKnown.geo.lng]);
    if (trailPts.length > 1) {
      L.polyline(trailPts, {
        color: "#ff7a1a",
        weight: 1.5,
        opacity: 0.45,
        dashArray: "4 6",
        interactive: false,
        className: "ember-trail",
      }).addTo(layer);
    }

    // Embers: older activities, fading by age.
    for (const a of geoActs) {
      const t = new Date(a.publishedAt).getTime();
      const age = Number.isNaN(t) ? maxAgeMs : Math.max(0, now - t);
      const freshness = 1 - Math.min(1, age / maxAgeMs); // 1 = new, 0 = old
      L.circleMarker([a.geo.lat, a.geo.lng], {
        radius: 4 + freshness * 3,
        color: "#ff8c2a",
        weight: 1,
        opacity: 0.25 + freshness * 0.5,
        fillColor: "#ff5a00",
        fillOpacity: 0.12 + freshness * 0.4,
        className: "ember-marker",
      })
        .bindPopup(popupHtml(a, false), { className: "map-popup-wrap" })
        .addTo(layer);
    }

    if (lastKnown) {
      L.marker([lastKnown.geo.lat, lastKnown.geo.lng], {
        icon: fireIcon,
        zIndexOffset: 1000,
        keyboard: true,
        title: lastKnown.geo.name,
        riseOnHover: true,
      })
        .bindPopup(popupHtml(lastKnown, true), { className: "map-popup-wrap" })
        .addTo(layer);

      const abroad = !isInLatvia(lastKnown.geo.lat, lastKnown.geo.lng);
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const target: L.LatLngTuple = [lastKnown.geo.lat, lastKnown.geo.lng];
      const zoom = abroad ? 5 : 12;
      if (reduce) map.setView(target, zoom);
      else map.flyTo(target, zoom, { duration: 2.2 });
    } else {
      map.setView(LATVIA_CENTER, LATVIA_ZOOM);
    }
  }, [activities, lastKnown]);

  return (
    <div
      ref={containerRef}
      className="live-map h-full w-full"
      role="region"
      aria-label="Karte ar premjerministra pēdējo zināmo atrašanās vietu"
    />
  );
}
