"""Shared module: PlacesClient, tile-grid generator, haversine, label helpers."""
from __future__ import annotations

import math
import time
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any

import requests

PLACES_API_BASE = "https://places.googleapis.com/v1"

# Words kept lowercase inside multi-word labels (everything else gets capitalised).
_LABEL_LOWERCASE_WORDS = {"of", "the", "and", "in", "on", "for", "to", "a", "an"}


# Country / region flags for `<cuisine>_restaurant` types. Key is the cuisine
# prefix (the string before `_restaurant`). Resolution falls through to this
# dict only if `TYPE_ICONS` below didn't already match the full token.
CUISINE_FLAGS = {
    "afghani": "🇦🇫",
    "african": "🌍",
    "american": "🇺🇸",
    "argentinian": "🇦🇷",
    "asian": "🌏",
    "asian_fusion": "🌏",
    "basque": "🇪🇸",
    "belgian": "🇧🇪",
    "brazilian": "🇧🇷",
    "british": "🇬🇧",
    "californian": "🇺🇸",
    "cambodian": "🇰🇭",
    "cantonese": "🇨🇳",
    "caribbean": "🌴",
    "chinese": "🇨🇳",
    "chinese_noodle": "🇨🇳",
    "colombian": "🇨🇴",
    "cuban": "🇨🇺",
    "dim_sum": "🇨🇳",
    "eastern_european": "🌍",
    "ethiopian": "🇪🇹",
    "european": "🇪🇺",
    "french": "🇫🇷",
    "fusion": "🌏",
    "german": "🇩🇪",
    "greek": "🇬🇷",
    "hawaiian": "🌺",
    "hungarian": "🇭🇺",
    "indian": "🇮🇳",
    "indonesian": "🇮🇩",
    "irish": "🇮🇪",
    "israeli": "🇮🇱",
    "italian": "🇮🇹",
    "japanese": "🇯🇵",
    "japanese_curry": "🇯🇵",
    "japanese_izakaya": "🇯🇵",
    "korean": "🇰🇷",
    "korean_barbecue": "🇰🇷",
    "latin_american": "🌎",
    "lebanese": "🇱🇧",
    "malaysian": "🇲🇾",
    "mediterranean": "🌊",
    "mexican": "🇲🇽",
    "middle_eastern": "🕌",
    "mongolian_barbecue": "🇲🇳",
    "moroccan": "🇲🇦",
    "north_indian": "🇮🇳",
    "pakistani": "🇵🇰",
    "persian": "🇮🇷",
    "peruvian": "🇵🇪",
    "portuguese": "🇵🇹",
    "romanian": "🇷🇴",
    "russian": "🇷🇺",
    "scandinavian": "🌍",
    "soul_food": "🇺🇸",
    "south_american": "🌎",
    "south_indian": "🇮🇳",
    "spanish": "🇪🇸",
    "sri_lankan": "🇱🇰",
    "taiwanese": "🇹🇼",
    "tex_mex": "🇲🇽",
    "thai": "🇹🇭",
    "tibetan": "🏔️",
    "tonkatsu": "🇯🇵",
    "turkish": "🇹🇷",
    "ukrainian": "🇺🇦",
    "vietnamese": "🇻🇳",
    "western": "🇺🇸",
    "yakiniku": "🇯🇵",
    "yakitori": "🇯🇵",
}

# Explicit icon for any raw type token. Checked BEFORE the cuisine-flag
# fallback, so e.g. `pizza_restaurant` resolves to 🍕 here rather than
# attempting `pizza` -> CUISINE_FLAGS lookup.
TYPE_ICONS = {
    # Generic
    "restaurant": "🍽️",
    "food": "🍽️",
    "establishment": "🏢",
    "point_of_interest": "📍",
    # Style/format restaurants (non-cuisine)
    "bar_and_grill": "🍖",
    "barbecue_restaurant": "🍖",
    "bistro": "🥖",
    "breakfast_restaurant": "🥞",
    "brunch_restaurant": "🥞",
    "buffet_restaurant": "🍱",
    "burrito_restaurant": "🌯",
    "cafeteria": "🍴",
    "chicken_restaurant": "🍗",
    "chicken_wings_restaurant": "🍗",
    "diner": "🍳",
    "dumpling_restaurant": "🥟",
    "falafel_restaurant": "🥙",
    "family_restaurant": "👨‍👩‍👧",
    "fast_food_restaurant": "🍔",
    "fine_dining_restaurant": "🥂",
    "fish_and_chips_restaurant": "🐟",
    "fondue_restaurant": "🫕",
    "halal_restaurant": "☪️",
    "hamburger_restaurant": "🍔",
    "hot_dog_restaurant": "🌭",
    "hot_dog_stand": "🌭",
    "hot_pot_restaurant": "🍲",
    "kebab_shop": "🌯",
    "noodle_shop": "🍜",
    "oyster_bar_restaurant": "🦪",
    "pizza_delivery": "🍕",
    "pizza_restaurant": "🍕",
    "ramen_restaurant": "🍜",
    "seafood_restaurant": "🦐",
    "shawarma_restaurant": "🌯",
    "soup_restaurant": "🍲",
    "steak_house": "🥩",
    "sushi_restaurant": "🍣",
    "taco_restaurant": "🌮",
    "tapas_restaurant": "🥘",
    "vegan_restaurant": "🌱",
    "vegetarian_restaurant": "🥬",
    # Bakeries / desserts
    "acai_shop": "🍇",
    "bagel_shop": "🥯",
    "bakery": "🥖",
    "cake_shop": "🍰",
    "candy_store": "🍬",
    "chocolate_shop": "🍫",
    "confectionery": "🍬",
    "dessert_restaurant": "🍰",
    "dessert_shop": "🍰",
    "donut_shop": "🍩",
    "ice_cream_shop": "🍦",
    "pastry_shop": "🥐",
    # Beverages
    "cafe": "☕",
    "coffee_roastery": "☕",
    "coffee_shop": "☕",
    "coffee_stand": "☕",
    "juice_shop": "🧃",
    "tea_house": "🍵",
    "tea_store": "🍵",
    # Bars
    "bar": "🍻",
    "brewery": "🍺",
    "brewpub": "🍺",
    "cocktail_bar": "🍸",
    "gastropub": "🍺",
    "hookah_bar": "💨",
    "irish_pub": "🍺",
    "liquor_store": "🍾",
    "lounge_bar": "🍸",
    "pub": "🍺",
    "sports_bar": "🏟️",
    "vineyard": "🍇",
    "wine_bar": "🍷",
    # Food retail / delivery
    "asian_grocery_store": "🛒",
    "butcher_shop": "🥩",
    "catering_service": "🍽️",
    "convenience_store": "🏪",
    "deli": "🥪",
    "food_court": "🍴",
    "food_delivery": "🛵",
    "food_store": "🛒",
    "general_store": "🏪",
    "grocery_store": "🛒",
    "health_food_store": "🛒",
    "hypermarket": "🛒",
    "market": "🏪",
    "meal_delivery": "🛵",
    "meal_takeaway": "🥡",
    "salad_shop": "🥗",
    "sandwich_shop": "🥪",
    "snack_bar": "🍿",
    "supermarket": "🛒",
    # Lodging
    "hostel": "🛏️",
    "hotel": "🏨",
    "lodging": "🏨",
    "resort_hotel": "🏨",
    # Entertainment / sports / culture
    "arena": "🏟️",
    "art_gallery": "🖼️",
    "art_museum": "🖼️",
    "auditorium": "🎭",
    "comedy_club": "🎭",
    "concert_hall": "🎵",
    "cultural_center": "🏛️",
    "event_venue": "🎉",
    "banquet_hall": "🎉",
    "fitness_center": "💪",
    "garden": "🌳",
    "gym": "💪",
    "historical_landmark": "🏛️",
    "historical_place": "🏛️",
    "karaoke": "🎤",
    "live_music_venue": "🎤",
    "movie_theater": "🎬",
    "museum": "🏛️",
    "night_club": "🎶",
    "observation_deck": "🔭",
    "performing_arts_theater": "🎭",
    "plaza": "🏛️",
    "sports_activity_location": "🏃",
    "sports_club": "🏃",
    "sports_complex": "🏟️",
    "sports_school": "🏃",
    "swimming_pool": "🏊",
    "television_studio": "📺",
    "tourist_attraction": "📷",
    "video_arcade": "🕹️",
    "wedding_venue": "💒",
    "yoga_studio": "🧘",
    # Beauty / wellness
    "beautician": "💇",
    "beauty_salon": "💇",
    "body_art_service": "🎨",
    "hair_care": "💇",
    "hair_salon": "💇",
    "massage": "💆",
    "massage_spa": "💆",
    "nail_salon": "💅",
    "public_bath": "🛁",
    "sauna": "🧖",
    "spa": "🧖",
    # Stores / retail
    "book_store": "📚",
    "clothing_store": "👕",
    "cosmetics_store": "💄",
    "department_store": "🏬",
    "florist": "💐",
    "gift_shop": "🎁",
    "home_goods_store": "🏠",
    "jewelry_store": "💎",
    "shoe_store": "👞",
    "shopping_mall": "🏬",
    "sporting_goods_store": "⚽",
    "sportswear_store": "👟",
    "store": "🏬",
    "womens_clothing_store": "👗",
    # Services / business
    "association_or_organization": "🏢",
    "city_hall": "🏛️",
    "consultant": "💼",
    "convention_center": "🏢",
    "corporate_office": "🏢",
    "coworking_space": "💼",
    "educational_institution": "🎓",
    "finance": "💰",
    "general_contractor": "🔧",
    "government_office": "🏛️",
    "internet_cafe": "💻",
    "local_government_office": "🏛️",
    "manufacturer": "🏭",
    "non_profit_organization": "🤝",
    "service": "🛠️",
    "shipping_service": "📦",
    "supplier": "📦",
    "tour_agency": "🧳",
    "transportation_service": "🚚",
    "travel_agency": "🧳",
    "wholesaler": "📦",
    # Other
    "barbecue_area": "🍖",
    "dog_cafe": "🐕",
    "farm": "🚜",
    "gas_station": "⛽",
    "health": "🏥",
    "parking": "🅿️",
    "parking_garage": "🅿️",
    "parking_lot": "🅿️",
}


def type_icon(raw: str | None) -> str:
    """Return a single-emoji icon for a Google place-type token, or "" if unmapped.

    Resolution order:
      1. Direct match in TYPE_ICONS (e.g. `pizza_restaurant` -> 🍕).
      2. `<cuisine>_restaurant` -> CUISINE_FLAGS lookup on the cuisine prefix
         (e.g. `french_restaurant` -> 🇫🇷).
      3. Empty string (caller decides how to render unmapped types).
    """
    if not raw:
        return ""
    if raw in TYPE_ICONS:
        return TYPE_ICONS[raw]
    if raw != "restaurant" and raw.endswith("_restaurant"):
        cuisine = raw[: -len("_restaurant")]
        if cuisine in CUISINE_FLAGS:
            return CUISINE_FLAGS[cuisine]
    return ""


def humanize_type(raw: str | None) -> str:
    """Turn a Google place-type token into a readable label.

    Cuisine types lose the `_restaurant` suffix so the output reads as the
    cuisine itself, the way the audit spreadsheet wants to display them:
        french_restaurant   -> "French"
        fast_food_restaurant -> "Fast Food"
        dessert_restaurant  -> "Dessert"

    The bare `restaurant` token is preserved (it's a category, not a cuisine):
        restaurant          -> "Restaurant"

    Other multi-word types follow standard title-casing with a small set of
    lowercase joiner words:
        point_of_interest   -> "Point of Interest"
        coffee_shop         -> "Coffee Shop"
    """
    if not raw:
        return ""
    token = raw
    if token != "restaurant" and token.endswith("_restaurant"):
        token = token[: -len("_restaurant")]
    parts = token.replace("_", " ").split()
    out: list[str] = []
    for i, word in enumerate(parts):
        if i > 0 and word in _LABEL_LOWERCASE_WORDS:
            out.append(word)
        else:
            out.append(word.capitalize())
    return " ".join(out)

# Bills as Place Details Pro (regularOpeningHours + priceLevel are Pro-tier).
DETAILS_FIELD_MASK = ",".join([
    "id",
    "displayName",
    "formattedAddress",
    "location",
    "googleMapsUri",
    "types",
    "primaryType",
    "regularOpeningHours",
    "priceLevel",
    "businessStatus",
])

# Bills as Nearby Search Pro (no atmosphere fields).
NEARBY_FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.formattedAddress",
])

EARTH_RADIUS_M = 6_371_000


@dataclass(frozen=True)
class TileCenter:
    latitude: float
    longitude: float


class PlacesClient:
    # Per-project per-minute quotas on Places API (New) are 600 RPM for both
    # Nearby Search and Place Details. 125 ms spacing caps us at 480 RPM --
    # comfortably under, with margin for clock drift and Google-side jitter.
    _MIN_CALL_INTERVAL_SEC = 0.125

    def __init__(self, api_key: str, *, timeout_sec: float = 30.0) -> None:
        self._api_key = api_key
        self._timeout = timeout_sec
        self._session = requests.Session()
        self._last_call_at = 0.0

    def nearby_search(
        self,
        *,
        latitude: float,
        longitude: float,
        radius_meters: float,
        included_types: Iterable[str] = ("restaurant",),
        max_result_count: int = 20,
    ) -> dict[str, Any]:
        body = {
            "includedTypes": list(included_types),
            "maxResultCount": max_result_count,
            "locationRestriction": {
                "circle": {
                    "center": {"latitude": latitude, "longitude": longitude},
                    "radius": radius_meters,
                },
            },
        }
        return self._request(
            "POST",
            "/places:searchNearby",
            field_mask=NEARBY_FIELD_MASK,
            json_body=body,
        )

    def get_place_details(self, place_id: str) -> dict[str, Any]:
        return self._request(
            "GET",
            f"/places/{place_id}",
            field_mask=DETAILS_FIELD_MASK,
        )

    def _request(
        self,
        method: str,
        path: str,
        *,
        field_mask: str,
        json_body: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        url = f"{PLACES_API_BASE}{path}"
        headers = {
            "X-Goog-Api-Key": self._api_key,
            "X-Goog-FieldMask": field_mask,
        }
        if json_body is not None:
            headers["Content-Type"] = "application/json"

        for attempt in range(5):
            # Proactive pacing -- ensures we never call faster than 8/sec.
            elapsed = time.monotonic() - self._last_call_at
            if elapsed < self._MIN_CALL_INTERVAL_SEC:
                time.sleep(self._MIN_CALL_INTERVAL_SEC - elapsed)
            self._last_call_at = time.monotonic()

            res = self._session.request(
                method,
                url,
                headers=headers,
                json=json_body,
                timeout=self._timeout,
            )
            if res.status_code < 400:
                return res.json()
            transient = res.status_code == 429 or res.status_code >= 500
            if transient and attempt < 4:
                # Per-minute quota can take up to 60 s to refill, so escalate
                # well past the 500 ms-x-2^n schedule we used to use.
                wait = (2, 8, 30, 60)[attempt]
                time.sleep(wait)
                continue
            raise RuntimeError(
                f"Places API {method} {path} failed: "
                f"{res.status_code} {res.text}"
            )
        raise RuntimeError("unreachable")


def haversine_meters(
    lat1: float, lng1: float, lat2: float, lng2: float
) -> float:
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lng / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def generate_tiles(
    *,
    center_lat: float,
    center_lng: float,
    outer_radius_meters: float,
    search_radius_meters: float,
) -> list[TileCenter]:
    """Grid of overlapping search circles. Step == search radius gives ~30%
    overlap so we don't miss restaurants on tile boundaries."""
    step = search_radius_meters
    cover_radius = outer_radius_meters + search_radius_meters
    steps_across = math.ceil(cover_radius / step)

    lat_deg_per_meter = 1 / (math.radians(1) * EARTH_RADIUS_M)
    lng_deg_per_meter = lat_deg_per_meter / math.cos(math.radians(center_lat))

    tiles: list[TileCenter] = []
    for i in range(-steps_across, steps_across + 1):
        for j in range(-steps_across, steps_across + 1):
            lat = center_lat + i * step * lat_deg_per_meter
            lng = center_lng + j * step * lng_deg_per_meter
            if haversine_meters(center_lat, center_lng, lat, lng) <= cover_radius:
                tiles.append(TileCenter(latitude=lat, longitude=lng))
    return tiles
