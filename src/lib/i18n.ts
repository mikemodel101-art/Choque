/*
 * lib/i18n.ts — translation scaffolding (English first).
 * Why: BJJ is a global community, so the copy layer is structured for
 * Portuguese and Spanish from day one. Strings live in flat dictionaries
 * keyed by dotted paths; `t()` resolves against the active locale and falls
 * back to English. Swapping in next-intl later means replacing this file,
 * not hunting hard-coded strings across the app.
 */
"use client";

import { createContext, useContext } from "react";

export const LOCALES = ["en", "pt", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  pt: "Português",
  es: "Español",
};

type Dict = Record<string, string>;

const en: Dict = {
  "nav.gyms": "Gyms",
  "nav.openMats": "Open mats",
  "nav.partners": "Partners",
  "nav.requests": "Requests",
  "nav.notebook": "Notebook",
  "nav.profile": "Profile",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.loading": "Loading…",
  "common.search": "Search",
  "common.clearFilters": "Clear all filters",
  "partners.title": "Find a training partner",
  "partners.connect": "Request to roll",
  "partners.requested": "Requested",
  "partners.connected": "Connected",
  "notebook.title": "Training notebook",
  "notebook.private": "Private by default — entries live only in this browser.",
  "notebook.new": "New entry",
};

/* Seeded with the highest-traffic strings; the rest fall back to English. */
const pt: Dict = {
  "nav.gyms": "Academias",
  "nav.openMats": "Treinos livres",
  "nav.partners": "Parceiros",
  "nav.requests": "Pedidos",
  "nav.notebook": "Caderno",
  "nav.profile": "Perfil",
  "common.save": "Salvar",
  "common.cancel": "Cancelar",
  "common.loading": "Carregando…",
  "common.search": "Buscar",
  "partners.title": "Encontre um parceiro de treino",
  "partners.connect": "Pedir para treinar",
  "notebook.title": "Caderno de treino",
};

const es: Dict = {
  "nav.gyms": "Gimnasios",
  "nav.openMats": "Open mats",
  "nav.partners": "Compañeros",
  "nav.requests": "Solicitudes",
  "nav.notebook": "Cuaderno",
  "nav.profile": "Perfil",
  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.loading": "Cargando…",
  "common.search": "Buscar",
  "partners.title": "Encuentra un compañero de entrenamiento",
  "partners.connect": "Pedir entrenar",
  "notebook.title": "Cuaderno de entrenamiento",
};

const DICTS: Record<Locale, Dict> = { en, pt, es };

export const LocaleContext = createContext<Locale>("en");

export function translate(locale: Locale, key: string, fallback?: string) {
  return DICTS[locale]?.[key] ?? DICTS.en[key] ?? fallback ?? key;
}

/** useT()("nav.gyms") → "Gyms" / "Academias" / "Gimnasios" */
export function useT() {
  const locale = useContext(LocaleContext);
  return (key: string, fallback?: string) => translate(locale, key, fallback);
}
