import type { Restaurant } from "./restaurants";

export const SORT_KEYS = [
  "weighted",
  "walking",
  "votes_dine_in",
  "votes_takeaway",
  "votes_vegetarian",
  "votes_halal",
  "votes_express",
  "votes_business",
  "votes_large_groups",
  "newest",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  weighted: "Most popular",
  walking: "Walking distance",
  votes_dine_in: "Most eat-in votes",
  votes_takeaway: "Most takeaway votes",
  votes_vegetarian: "Most vegetarian votes",
  votes_halal: "Most halal votes",
  votes_express: "Most express votes",
  votes_business: "Most business votes",
  votes_large_groups: "Most large-group votes",
  newest: "Newest",
};

export function isSortKey(v: string | undefined): v is SortKey {
  return !!v && (SORT_KEYS as readonly string[]).includes(v);
}

// Weighted score per spec: hearts count double. Tied scores fall back to
// walking time so the closer place wins — useful when no votes are in yet.
function weightedScore(r: Restaurant): number {
  return r.loveCount * 2 + r.likeCount;
}

// Tag-vote sort keys map to their count field on Restaurant. Ties break on
// weighted reactions (most popular) first, then walking time — so ties
// surface the better-loved place, falling back to the closest if nothing's
// been voted on yet.
const VOTE_GETTERS: Partial<Record<SortKey, (r: Restaurant) => number>> = {
  votes_dine_in: (r) => r.dineInCount,
  votes_takeaway: (r) => r.takeawayCount,
  votes_vegetarian: (r) => r.vegCount,
  votes_halal: (r) => r.halalCount,
  votes_express: (r) => r.expressCount,
  votes_business: (r) => r.businessCount,
  votes_large_groups: (r) => r.largeGroupCount,
};

export function sortRestaurants(list: Restaurant[], key: SortKey): Restaurant[] {
  const sorted = list.slice();
  const voteGetter = VOTE_GETTERS[key];
  if (voteGetter) {
    sorted.sort(
      (a, b) =>
        voteGetter(b) - voteGetter(a) ||
        weightedScore(b) - weightedScore(a) ||
        a.walkMin - b.walkMin,
    );
    return sorted;
  }
  switch (key) {
    case "weighted":
      sorted.sort(
        (a, b) => weightedScore(b) - weightedScore(a) || a.walkMin - b.walkMin,
      );
      return sorted;
    case "walking":
      sorted.sort((a, b) => a.walkMin - b.walkMin);
      return sorted;
    case "newest":
      // Approved submissions ordered most-recent-first; seeded entries
      // (approvedAt === null) sort to the bottom.
      sorted.sort((a, b) => {
        const at = a.approvedAt?.getTime() ?? 0;
        const bt = b.approvedAt?.getTime() ?? 0;
        if (at !== bt) return bt - at;
        return a.walkMin - b.walkMin;
      });
      return sorted;
    default:
      return sorted;
  }
}
