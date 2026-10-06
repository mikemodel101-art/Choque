/*
 * lib/hooks.ts — shared TanStack Query hooks.
 * Why: gyms, partners, open mats, RSVPs, saved gyms, and the notebook are
 * consumed by multiple screens. Centralizing query keys and mutations gives
 * consistent caching/invalidation (e.g. toggling an RSVP from a gym page also
 * updates the open-mats feed instantly) and one place for success toasts.
 */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { gymName } from "@/lib/data";

export function useGyms(filters: api.GymFilters) {
  return useQuery({ queryKey: ["gyms", filters], queryFn: () => api.listGyms(filters) });
}

export function useGym(slug: string) {
  return useQuery({ queryKey: ["gym", slug], queryFn: () => api.getGym(slug) });
}

export function useCities() {
  return useQuery({ queryKey: ["cities"], queryFn: api.listCities });
}

export function useSavedGyms() {
  return useQuery({ queryKey: ["saved-gyms"], queryFn: api.getSavedGyms });
}

export function useToggleSavedGym() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.toggleSavedGym,
    onSuccess: (ids, id) => {
      qc.setQueryData(["saved-gyms"], ids);
      toast.success(ids.includes(id) ? `${gymName(id)} saved` : `${gymName(id)} removed`);
    },
  });
}

export function usePartners(filters: api.PartnerFilters) {
  return useQuery({ queryKey: ["partners", filters], queryFn: () => api.listPartners(filters) });
}

export function usePartner(slug: string) {
  return useQuery({ queryKey: ["partner", slug], queryFn: () => api.getPartner(slug) });
}

export function useOpenMats(filters: api.MatFilters) {
  return useQuery({ queryKey: ["mats", filters], queryFn: () => api.listOpenMats(filters) });
}

export function useToggleRsvp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.toggleRsvp,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mats"] });
    },
  });
}

export function useNotebook() {
  return useQuery({ queryKey: ["notebook"], queryFn: api.listNotebookEntries });
}

export function useEventLog() {
  return useQuery({ queryKey: ["events"], queryFn: api.listEvents });
}

/* ——————————————————— Submissions & staff tools ——————————————————— */
export function useSubmissions(mineOnly = false) {
  return useQuery({
    queryKey: ["submissions", { mineOnly }],
    queryFn: () => api.listSubmissions(mineOnly),
  });
}

export function useDemoUsers(query = "") {
  return useQuery({
    queryKey: ["demo-users", query],
    queryFn: () => api.listDemoUsers(query),
  });
}

export function useAuditLog() {
  return useQuery({ queryKey: ["audit"], queryFn: api.listAuditEvents, retry: false });
}

/* ——————————————————— Connections, blocks, reports ——————————————————— */
export function useConnections() {
  return useQuery({ queryKey: ["connections"], queryFn: api.listConnections });
}

export function useBlocks() {
  return useQuery({ queryKey: ["blocks"], queryFn: api.listBlocks });
}

export function useReports() {
  return useQuery({ queryKey: ["reports"], queryFn: api.listReports, retry: false });
}

export function useCollections() {
  return useQuery({ queryKey: ["collections"], queryFn: api.listCollections });
}

export function useConnectionBudget() {
  return useQuery({ queryKey: ["connection-budget"], queryFn: api.connectionRequestsToday });
}
