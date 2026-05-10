// TypeScript port of `scripts/places.py`'s TYPE_ICONS / CUISINE_FLAGS /
// humanize_type / type_icon. Used by the admin-approval flow so submitted
// restaurants get the same enriched labels and icons as seeded ones.
// Keep in sync with the Python source.

const LABEL_LOWERCASE_WORDS = new Set([
  "of", "the", "and", "in", "on", "for", "to", "a", "an",
]);

const CUISINE_FLAGS: Record<string, string> = {
  afghani: "🇦🇫",
  african: "🌍",
  american: "🇺🇸",
  argentinian: "🇦🇷",
  asian: "🌏",
  asian_fusion: "🌏",
  basque: "🇪🇸",
  belgian: "🇧🇪",
  brazilian: "🇧🇷",
  british: "🇬🇧",
  californian: "🇺🇸",
  cambodian: "🇰🇭",
  cantonese: "🇨🇳",
  caribbean: "🌴",
  chinese: "🇨🇳",
  chinese_noodle: "🇨🇳",
  colombian: "🇨🇴",
  cuban: "🇨🇺",
  dim_sum: "🇨🇳",
  eastern_european: "🌍",
  ethiopian: "🇪🇹",
  european: "🇪🇺",
  french: "🇫🇷",
  fusion: "🌏",
  german: "🇩🇪",
  greek: "🇬🇷",
  hawaiian: "🌺",
  hungarian: "🇭🇺",
  indian: "🇮🇳",
  indonesian: "🇮🇩",
  irish: "🇮🇪",
  israeli: "🇮🇱",
  italian: "🇮🇹",
  japanese: "🇯🇵",
  japanese_curry: "🇯🇵",
  japanese_izakaya: "🇯🇵",
  korean: "🇰🇷",
  korean_barbecue: "🇰🇷",
  latin_american: "🌎",
  lebanese: "🇱🇧",
  malaysian: "🇲🇾",
  mediterranean: "🌊",
  mexican: "🇲🇽",
  middle_eastern: "🕌",
  mongolian_barbecue: "🇲🇳",
  moroccan: "🇲🇦",
  north_indian: "🇮🇳",
  pakistani: "🇵🇰",
  persian: "🇮🇷",
  peruvian: "🇵🇪",
  portuguese: "🇵🇹",
  romanian: "🇷🇴",
  russian: "🇷🇺",
  scandinavian: "🌍",
  soul_food: "🇺🇸",
  south_american: "🌎",
  south_indian: "🇮🇳",
  spanish: "🇪🇸",
  sri_lankan: "🇱🇰",
  taiwanese: "🇹🇼",
  tex_mex: "🇲🇽",
  thai: "🇹🇭",
  tibetan: "🏔️",
  tonkatsu: "🇯🇵",
  turkish: "🇹🇷",
  ukrainian: "🇺🇦",
  vietnamese: "🇻🇳",
  western: "🇺🇸",
  yakiniku: "🇯🇵",
  yakitori: "🇯🇵",
};

const TYPE_ICONS: Record<string, string> = {
  restaurant: "🍽️",
  food: "🍽️",
  establishment: "🏢",
  point_of_interest: "📍",
  bar_and_grill: "🍖",
  barbecue_restaurant: "🍖",
  bistro: "🥖",
  breakfast_restaurant: "🥞",
  brunch_restaurant: "🥞",
  buffet_restaurant: "🍱",
  burrito_restaurant: "🌯",
  cafeteria: "🍴",
  chicken_restaurant: "🍗",
  chicken_wings_restaurant: "🍗",
  diner: "🍳",
  dumpling_restaurant: "🥟",
  falafel_restaurant: "🥙",
  family_restaurant: "👨‍👩‍👧",
  fast_food_restaurant: "🍔",
  fine_dining_restaurant: "🥂",
  fish_and_chips_restaurant: "🐟",
  fondue_restaurant: "🫕",
  halal_restaurant: "☪️",
  hamburger_restaurant: "🍔",
  hot_dog_restaurant: "🌭",
  hot_dog_stand: "🌭",
  hot_pot_restaurant: "🍲",
  kebab_shop: "🌯",
  noodle_shop: "🍜",
  oyster_bar_restaurant: "🦪",
  pizza_delivery: "🍕",
  pizza_restaurant: "🍕",
  ramen_restaurant: "🍜",
  seafood_restaurant: "🦐",
  shawarma_restaurant: "🌯",
  soup_restaurant: "🍲",
  steak_house: "🥩",
  sushi_restaurant: "🍣",
  taco_restaurant: "🌮",
  tapas_restaurant: "🥘",
  vegan_restaurant: "🌱",
  vegetarian_restaurant: "🥬",
  acai_shop: "🍇",
  bagel_shop: "🥯",
  bakery: "🥖",
  cake_shop: "🍰",
  candy_store: "🍬",
  chocolate_shop: "🍫",
  confectionery: "🍬",
  dessert_restaurant: "🍰",
  dessert_shop: "🍰",
  donut_shop: "🍩",
  ice_cream_shop: "🍦",
  pastry_shop: "🥐",
  cafe: "☕",
  coffee_roastery: "☕",
  coffee_shop: "☕",
  coffee_stand: "☕",
  juice_shop: "🧃",
  tea_house: "🍵",
  tea_store: "🍵",
  bar: "🍻",
  brewery: "🍺",
  brewpub: "🍺",
  cocktail_bar: "🍸",
  gastropub: "🍺",
  hookah_bar: "💨",
  irish_pub: "🍺",
  liquor_store: "🍾",
  lounge_bar: "🍸",
  pub: "🍺",
  sports_bar: "🏟️",
  vineyard: "🍇",
  wine_bar: "🍷",
  asian_grocery_store: "🛒",
  butcher_shop: "🥩",
  catering_service: "🍽️",
  convenience_store: "🏪",
  deli: "🥪",
  food_court: "🍴",
  food_delivery: "🛵",
  food_store: "🛒",
  general_store: "🏪",
  grocery_store: "🛒",
  health_food_store: "🛒",
  hypermarket: "🛒",
  market: "🏪",
  meal_delivery: "🛵",
  meal_takeaway: "🥡",
  salad_shop: "🥗",
  sandwich_shop: "🥪",
  snack_bar: "🍿",
  supermarket: "🛒",
};

export function typeIcon(raw: string | null | undefined): string {
  if (!raw) return "";
  if (raw in TYPE_ICONS) return TYPE_ICONS[raw]!;
  if (raw !== "restaurant" && raw.endsWith("_restaurant")) {
    const cuisine = raw.slice(0, -"_restaurant".length);
    if (cuisine in CUISINE_FLAGS) return CUISINE_FLAGS[cuisine]!;
  }
  return "";
}

// Subset of TYPE_ICONS suitable as a cuisine/style dropdown for manual
// approvals. Excludes generic categories (food, restaurant) and non-food
// types (lodging / arts / shops). Cuisine `<x>_restaurant` rows aren't
// listed here — they're added below from CUISINE_FLAGS.
const RESTAURANT_STYLE_TYPES = [
  "bar_and_grill",
  "barbecue_restaurant",
  "bistro",
  "breakfast_restaurant",
  "brunch_restaurant",
  "buffet_restaurant",
  "burrito_restaurant",
  "cafeteria",
  "chicken_restaurant",
  "diner",
  "dumpling_restaurant",
  "falafel_restaurant",
  "family_restaurant",
  "fast_food_restaurant",
  "fine_dining_restaurant",
  "fish_and_chips_restaurant",
  "fondue_restaurant",
  "halal_restaurant",
  "hamburger_restaurant",
  "hot_dog_restaurant",
  "hot_pot_restaurant",
  "kebab_shop",
  "noodle_shop",
  "oyster_bar_restaurant",
  "pizza_restaurant",
  "ramen_restaurant",
  "seafood_restaurant",
  "shawarma_restaurant",
  "soup_restaurant",
  "steak_house",
  "sushi_restaurant",
  "taco_restaurant",
  "tapas_restaurant",
  "vegan_restaurant",
  "vegetarian_restaurant",
  "bakery",
  "cafe",
  "coffee_shop",
  "deli",
  "food_court",
  "meal_takeaway",
  "salad_shop",
  "sandwich_shop",
  "snack_bar",
  "wine_bar",
  "bar",
  "pub",
];

// Sorted, deduplicated, prefixed by their icon for nicer dropdown rendering.
export const RESTAURANT_TYPE_OPTIONS: Array<{ value: string; label: string; icon: string }> = (() => {
  const cuisineTypes = Object.keys(CUISINE_FLAGS).map((c) => `${c}_restaurant`);
  const all = Array.from(new Set([...RESTAURANT_STYLE_TYPES, ...cuisineTypes]));
  all.sort((a, b) => humanizeType(a).localeCompare(humanizeType(b)));
  return all.map((value) => ({
    value,
    label: humanizeType(value),
    icon: typeIcon(value),
  }));
})();

export function humanizeType(raw: string | null | undefined): string {
  if (!raw) return "";
  let token = raw;
  if (token !== "restaurant" && token.endsWith("_restaurant")) {
    token = token.slice(0, -"_restaurant".length);
  }
  const parts = token.replace(/_/g, " ").split(" ").filter(Boolean);
  return parts
    .map((word, i) =>
      i > 0 && LABEL_LOWERCASE_WORDS.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}
