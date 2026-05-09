// Pure types + helpers for restaurants. No DB imports — safe to pull into
// both client and server code.

import type { TagAttribute } from "@/src/db/schema";

import type { Compass8 } from "./walking";

export type PriceLevel =
  | "PRICE_LEVEL_FREE"
  | "PRICE_LEVEL_INEXPENSIVE"
  | "PRICE_LEVEL_MODERATE"
  | "PRICE_LEVEL_EXPENSIVE"
  | "PRICE_LEVEL_VERY_EXPENSIVE";

export type MyState = {
  reaction: "love" | "like" | null;
  tags: Record<TagAttribute, boolean>;
};

export const EMPTY_MY_STATE: MyState = {
  reaction: null,
  tags: {
    dine_in: false,
    takeaway: false,
    vegetarian: false,
    halal: false,
    express: false,
    business: false,
    large_groups: false,
  },
};

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  googleMapsUri: string;
  primaryTypeLabel: string;
  primaryTypeIcon: string;
  priceLevel: PriceLevel | null;
  walkMin: number;
  direction: Compass8;
  loveCount: number;
  likeCount: number;
  commentCount: number;
  dineInCount: number;
  takeawayCount: number;
  vegCount: number;
  halalCount: number;
  expressCount: number;
  businessCount: number;
  largeGroupCount: number;
  approvedAt: Date | null;
  source: "seeded" | "submitted";
  my: MyState;
};

export function priceLevelToSymbol(level: PriceLevel | null): string {
  switch (level) {
    case "PRICE_LEVEL_INEXPENSIVE":
      return "€";
    case "PRICE_LEVEL_MODERATE":
      return "€€";
    case "PRICE_LEVEL_EXPENSIVE":
      return "€€€";
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return "€€€€";
    default:
      return "";
  }
}
