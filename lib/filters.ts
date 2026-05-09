import type { Restaurant } from "./restaurants";

export type DietaryKey = "vegetarian" | "halal";
export const DIETARY_KEYS: DietaryKey[] = ["vegetarian", "halal"];
export type ServiceKey = "dine_in" | "takeaway";
export const SERVICE_KEYS: ServiceKey[] = ["dine_in", "takeaway"];
export type OccasionKey = "express" | "business" | "large_groups";
export const OCCASION_KEYS: OccasionKey[] = ["express", "business", "large_groups"];

export type Filters = {
  dietary: Set<DietaryKey>;
  service: Set<ServiceKey>;
  occasion: Set<OccasionKey>;
};

export function emptyFilters(): Filters {
  return {
    dietary: new Set(),
    service: new Set(),
    occasion: new Set(),
  };
}

export function hasAnyFilter(f: Filters): boolean {
  return f.dietary.size > 0 || f.service.size > 0 || f.occasion.size > 0;
}

function parseSet<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
): Set<T> {
  if (!raw) return new Set();
  const out = new Set<T>();
  for (const part of raw.split(",")) {
    const v = part.trim();
    if ((allowed as readonly string[]).includes(v)) out.add(v as T);
  }
  return out;
}

export function parseFilters(params: {
  dietary?: string;
  service?: string;
  occasion?: string;
}): Filters {
  return {
    dietary: parseSet(params.dietary, DIETARY_KEYS),
    service: parseSet(params.service, SERVICE_KEYS),
    occasion: parseSet(params.occasion, OCCASION_KEYS),
  };
}

export function applyFilters(list: Restaurant[], f: Filters): Restaurant[] {
  if (!hasAnyFilter(f)) return list;

  return list.filter((r) => {
    if (f.dietary.size > 0) {
      const ok =
        (f.dietary.has("vegetarian") && r.vegCount > 0) ||
        (f.dietary.has("halal") && r.halalCount > 0);
      if (!ok) return false;
    }
    if (f.service.size > 0) {
      const ok =
        (f.service.has("dine_in") && r.dineInCount > 0) ||
        (f.service.has("takeaway") && r.takeawayCount > 0);
      if (!ok) return false;
    }
    if (f.occasion.size > 0) {
      const ok =
        (f.occasion.has("express") && r.expressCount > 0) ||
        (f.occasion.has("business") && r.businessCount > 0) ||
        (f.occasion.has("large_groups") && r.largeGroupCount > 0);
      if (!ok) return false;
    }
    return true;
  });
}
