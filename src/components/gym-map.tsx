/*
 * components/gym-map.tsx — Leaflet + OpenStreetMap results map.
 * Why: spec 5.1 asks for a real map with clustered pins where selecting a pin
 * highlights the matching card. Leaflet is loaded dynamically (browser only)
 * so SSR stays clean, pins cluster by proximity at the current zoom, and a
 * keyboard-navigable text list sits underneath — the map is never the only
 * way to reach a gym.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Gym } from "@/lib/types";
import { cn } from "@/lib/utils";

/* City centroids for the demo dataset; a real build reads gyms.lat/lng. */
const CITY_COORDS: Record<string, [number, number]> = {
  "Los Angeles": [34.0522, -118.2437],
  "San Diego": [32.7157, -117.1611],
  "San Francisco": [37.7749, -122.4194],
  Portland: [45.5152, -122.6765],
  Seattle: [47.6062, -122.3321],
  Denver: [39.7392, -104.9903],
  Austin: [30.2672, -97.7431],
  Chicago: [41.8781, -87.6298],
  Miami: [25.7617, -80.1918],
  "New York": [40.7128, -74.006],
};

function hash01(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function coordsFor(g: Gym): [number, number] {
  const base = CITY_COORDS[g.city] ?? [39.5, -98.35];
  return [base[0] + (hash01(g.id) - 0.5) * 0.08, base[1] + (hash01(g.slug) - 0.5) * 0.08];
}

export function GymMap({
  gyms,
  selectedId,
  onSelect,
}: {
  gyms: Gym[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<Map<string, { marker: unknown; setActive: (v: boolean) => void }>>(new Map());
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const points = useMemo(() => gyms.map((g) => ({ gym: g, pos: coordsFor(g) })), [gyms]);

  /* ——— Initialise Leaflet in the browser only ——— */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");
        if (cancelled || !containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
          scrollWheelZoom: false,
          attributionControl: true,
        }).setView([39.5, -98.35], 4);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        mapRef.current = map;
        setReady(true);
      } catch {
        setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      const m = mapRef.current as { remove?: () => void } | null;
      m?.remove?.();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  /* ——— Draw / refresh pins with simple proximity clustering ——— */
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      if (cancelled) return;
      const map = mapRef.current as import("leaflet").Map;

      markersRef.current.forEach(({ marker }) => map.removeLayer(marker as import("leaflet").Layer));
      markersRef.current.clear();

      // Cluster gyms that share a city into one numbered pin until zoomed in.
      const groups = new Map<string, typeof points>();
      points.forEach((p) => {
        const key = p.gym.city;
        groups.set(key, [...(groups.get(key) ?? []), p]);
      });

      const bounds: [number, number][] = [];

      groups.forEach((members, city) => {
        const clustered = members.length > 1 && map.getZoom() < 8;
        if (clustered) {
          const base = CITY_COORDS[city] ?? members[0].pos;
          const icon = L.divIcon({
            className: "",
            html: `<span style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:999px;background:var(--accent);color:#fff;font:600 13px/1 system-ui;box-shadow:0 2px 8px rgb(0 0 0 / .3)">${members.length}</span>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          });
          const marker = L.marker(base as [number, number], { icon, title: `${members.length} gyms in ${city}` }).addTo(map);
          marker.on("click", () => map.setView(base as [number, number], 11, { animate: true }));
          markersRef.current.set(`cluster-${city}`, { marker, setActive: () => {} });
          bounds.push(base as [number, number]);
        } else {
          members.forEach(({ gym, pos }) => {
            const makeIcon = (active: boolean) =>
              L.divIcon({
                className: "",
                html: `<span style="display:block;width:${active ? 22 : 16}px;height:${active ? 22 : 16}px;border-radius:999px;background:${active ? "var(--accent)" : "var(--surface)"};border:3px solid var(--accent);box-shadow:0 2px 6px rgb(0 0 0 / .3);transition:all .15s"></span>`,
                iconSize: [active ? 22 : 16, active ? 22 : 16],
                iconAnchor: [active ? 11 : 8, active ? 11 : 8],
              });
            const marker = L.marker(pos, { icon: makeIcon(selectedId === gym.id), title: gym.name, keyboard: true })
              .addTo(map)
              .bindPopup(
                `<strong>${gym.name}</strong><br/>${gym.city}, ${gym.state}<br/><a href="/gyms/${gym.slug}">View gym →</a>`,
              );
            marker.on("click", () => onSelect?.(gym.id));
            markersRef.current.set(gym.id, {
              marker,
              setActive: (v: boolean) => marker.setIcon(makeIcon(v)),
            });
            bounds.push(pos);
          });
        }
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
      }
    })();

    return () => { cancelled = true; };
  }, [ready, points, selectedId, onSelect]);

  /* ——— Reflect external selection (card hover/click) on the map ——— */
  useEffect(() => {
    markersRef.current.forEach(({ setActive }, id) => setActive(id === selectedId));
    if (selectedId && mapRef.current) {
      const entry = markersRef.current.get(selectedId);
      const marker = entry?.marker as import("leaflet").Marker | undefined;
      marker?.openPopup?.();
    }
  }, [selectedId]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-md border border-border bg-surface shadow-1">
        <div
          ref={containerRef}
          className="h-[420px] w-full bg-foreground/[0.03]"
          role="application"
          aria-label={`Map showing ${gyms.length} academies`}
        />
        {!ready && !failed && (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted">Loading map…</div>
        )}
        {failed && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">
            The map could not load. Use the list below — every gym is reachable without it.
          </div>
        )}
      </div>

      {/* Keyboard/screen-reader equivalent; clicking highlights the pin */}
      <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Gyms on the map">
        {gyms.map((g) => (
          <li key={g.id}>
            <div
              className={cn(
                "flex items-center gap-2 rounded-sm border bg-surface px-3 py-2.5 text-sm shadow-1 transition-colors",
                selectedId === g.id ? "border-accent ring-2 ring-accent/25" : "border-border hover:border-muted/60",
              )}
            >
              <button
                onClick={() => onSelect?.(selectedId === g.id ? null : g.id)}
                aria-pressed={selectedId === g.id}
                aria-label={`Highlight ${g.name} on the map`}
                className="flex size-6 items-center justify-center rounded-full text-accent focus-visible:outline-2 focus-visible:outline-accent"
              >
                <MapPin className="size-4" />
              </button>
              <Link href={`/gyms/${g.slug}`} className="min-w-0 flex-1 truncate underline-offset-4 hover:text-accent hover:underline">
                <span className="font-medium">{g.name}</span>
                <span className="text-muted"> · {g.neighborhood ?? g.city}</span>
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
