import { trpc } from "@/lib/trpc";

/**
 * A road or a production facility, as one pickable option. Most finance views
 * span both, but the API takes exactly one of roadId/facilityId — the prefixed
 * `key` keeps a single <select> unambiguous, and `scopeArgs` converts it back.
 */
export interface ScopeOption {
  key: string;
  id: string;
  name: string;
  kind: "road" | "facility";
}

export function useScopeOptions(): ScopeOption[] {
  const { data: roads } = trpc.road.list.useQuery();
  const { data: facilities } = trpc.productionFacility.list.useQuery();
  return [
    ...(roads ?? []).map((r) => ({ key: `road:${r.id}`, id: r.id, name: r.name, kind: "road" as const })),
    ...(facilities ?? []).map((f) => ({ key: `facility:${f.id}`, id: f.id, name: f.name, kind: "facility" as const })),
  ];
}

export function scopeArgs(key: string): { roadId?: string; facilityId?: string } {
  if (key.startsWith("road:")) return { roadId: key.slice("road:".length) };
  if (key.startsWith("facility:")) return { facilityId: key.slice("facility:".length) };
  return {};
}

/** Display name for any record that hangs off a road or a facility. */
export function scopeLabel(entity: { road?: { name: string } | null; facility?: { name: string } | null }): string {
  return entity.road?.name ?? entity.facility?.name ?? "—";
}

/**
 * Destination for an alert/action payload. Payloads are untyped JSON carrying
 * either a roadId or a facilityId, and the two route to different modules — so
 * the link can only be built after checking which one is present.
 */
export function scopeHref(payload: Record<string, unknown>): string | undefined {
  if (typeof payload.roadId === "string") return `/site-operations/${payload.roadId}`;
  if (typeof payload.facilityId === "string") return `/production/${payload.facilityId}`;
  return undefined;
}

type ScopeEntry =
  | { kind: "road"; road: { id: string; name: string } }
  | { kind: "facility"; facility: { id: string; name: string } };

/** Flattens the tagged-union rows returned by rollups that cover roads and facilities alike. */
export function entryScope(entry: ScopeEntry): ScopeOption {
  return entry.kind === "road"
    ? { key: `road:${entry.road.id}`, id: entry.road.id, name: entry.road.name, kind: "road" }
    : { key: `facility:${entry.facility.id}`, id: entry.facility.id, name: entry.facility.name, kind: "facility" };
}
