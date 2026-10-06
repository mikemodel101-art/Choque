/*
 * lib/directory.ts — the editable directory overlay.
 * Why: the demo dataset in lib/data.ts is read-only by design, but staff need
 * real add/edit/delete over gyms, open mats and partners. This module layers
 * stored overrides (edits, additions, deletions) on top of the base data, so
 * every reader — directory pages, admin tables, the map, the command palette —
 * sees one consistent, editable world. The admin CRUD functions live in
 * lib/api.ts so every mutation passes the staff capability check and is
 * written to the audit log.
 */
import { GYMS, OPEN_MATS, PARTNERS } from "./data";
import * as store from "./storage";
import type { Gym, OpenMat, Partner } from "./types";

/** Gym with optional admin overrides applied. */
export function gyms(): Gym[] {
  const edits = store.getGymEdits();
  const dels = new Set(store.getGymDeletes());
  return [
    ...store.getGymAdds(),
    ...GYMS.map((g) => ({ ...g, ...(edits[g.slug] ?? {}) })),
  ].filter((g) => !dels.has(g.slug));
}

export function gymBySlug(slug: string): Gym | undefined {
  return gyms().find((g) => g.slug === slug);
}

export function gymById(id: string): Gym | undefined {
  return gyms().find((g) => g.id === id);
}

/** Open mats with admin overrides applied. */
export function mats(): OpenMat[] {
  const edits = store.getMatEdits();
  const dels = new Set(store.getMatDeletes());
  return [
    ...store.getMatAdds(),
    ...OPEN_MATS.map((m) => ({ ...m, ...(edits[m.id] ?? {}) })),
  ].filter((m) => !dels.has(m.id));
}

/** Partners with admin overrides applied. */
export function partners(): Partner[] {
  const edits = store.getPartnerEdits();
  const dels = new Set(store.getPartnerDeletes());
  return [
    ...store.getPartnerAdds(),
    ...PARTNERS.map((p) => ({ ...p, ...(edits[p.slug] ?? {}) })),
  ].filter((p) => !dels.has(p.slug));
}

export function partnerBySlug(slug: string): Partner | undefined {
  return partners().find((p) => p.slug === slug);
}

export function cities(): string[] {
  return [...new Set(gyms().map((g) => g.city))].sort();
}
