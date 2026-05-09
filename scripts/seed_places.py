"""Full Google Places ingestion for Ou Dejeuner.

1. Generate a grid of overlapping search circles around the office.
2. Run Nearby Search per tile, dedupe place IDs.
3. Fetch Place Details (Essentials + Pro field mask) for each unique ID.
4. Write all results to data/restaurants.json -- checkpointed per place.

Resumable: if data/restaurants.json already exists from a previous run, place
IDs already in it are skipped during the details phase, so a mid-run crash
costs only the Nearby Search re-sweep (~$2.59 worst case, $0 inside free cap),
not the much pricier Details fan-out.

Run monthly to satisfy Google's 30-day cache TOS.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parent))
from places import PlacesClient, generate_tiles

# Office anchor — loaded from env so the public repo doesn't pin coords.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _read_coord(name: str) -> float:
    raw = os.environ.get(name)
    if not raw:
        raise SystemExit(f"{name} env var is required (define in .env)")
    try:
        return float(raw)
    except ValueError:
        raise SystemExit(f"{name} must be a number, got: {raw!r}")


OFFICE_LAT = _read_coord("OFFICE_LAT")
OFFICE_LNG = _read_coord("OFFICE_LNG")

# ~15-min walk per product-requirements-v2.md (~1.1-1.2 km radius).
OUTER_RADIUS_M = 1_200.0

# Per-tile search radius. Iteration history around Bd Haussmann (9th arr.,
# very dense): 300 m -> 92% cap saturation, 200 m -> 89%, 100 m + broader
# types -> 51%. 75 m should drop saturation below ~20% and resolve the
# remaining long-tail of missed places in the densest pockets.
TILE_SEARCH_RADIUS_M = 75.0

# Lunch-relevant Place types. Bakeries (boulangeries) are huge for lunch in
# Paris; sandwich_shop, cafe, meal_takeaway capture the rest of the non-
# restaurant lunch options. Cuisine-specific types (french_restaurant, etc.)
# are not listed because they all carry "restaurant" in their types array.
INCLUDED_TYPES = (
    "restaurant",
    "bakery",
    "sandwich_shop",
    "cafe",
    "meal_takeaway",
)


def _atomic_write_json(path: Path, payload: dict[str, Any]) -> None:
    """Write JSON via temp + os.replace so a mid-write crash never leaves a
    half-truncated file."""
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    os.replace(tmp, path)


def _load_checkpoint(
    path: Path,
) -> tuple[list[dict[str, Any]], set[str], dict[str, Any] | None]:
    """Return (existing places, set of their IDs, anchor metadata) from a
    prior run's file, or empties if no checkpoint exists."""
    if not path.exists():
        return [], set(), None
    raw = path.read_text(encoding="utf-8")
    existing = json.loads(raw)
    places = existing.get("places", []) or []
    ids = {p["id"] for p in places if isinstance(p, dict) and "id" in p}
    return places, ids, existing.get("anchor")


def _build_payload(
    *,
    run_at: str,
    tile_count: int,
    unique_place_ids: int,
    places: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "runAt": run_at,
        "anchor": {"latitude": OFFICE_LAT, "longitude": OFFICE_LNG},
        "outerRadiusMeters": OUTER_RADIUS_M,
        "tileSearchRadiusMeters": TILE_SEARCH_RADIUS_M,
        "tileCount": tile_count,
        "uniquePlaceIds": unique_place_ids,
        "places": places,
    }


def main() -> int:
    project_root = Path(__file__).resolve().parent.parent
    load_dotenv(project_root / ".env")

    api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
    if not api_key:
        print("GOOGLE_PLACES_API_KEY not set", file=sys.stderr)
        return 1

    out_dir = project_root / "data"
    out_dir.mkdir(exist_ok=True)
    out_path = out_dir / "restaurants.json"

    existing_places, already_fetched, prior_anchor = _load_checkpoint(out_path)
    if already_fetched:
        # Bail rather than mix data from a different anchor — the JSON file
        # represents one specific catalogue, and silently merging across
        # anchors would corrupt the dataset.
        if prior_anchor and (
            prior_anchor.get("latitude") != OFFICE_LAT
            or prior_anchor.get("longitude") != OFFICE_LNG
        ):
            print(
                f"Refusing to resume: existing checkpoint has anchor "
                f"{prior_anchor}, current run uses "
                f"({OFFICE_LAT}, {OFFICE_LNG}). "
                f"Move {out_path} aside and re-run if this is intentional.",
                file=sys.stderr,
            )
            return 1
        print(
            f"Resuming: {len(already_fetched)} places already in {out_path}\n"
        )

    client = PlacesClient(api_key)
    tiles = generate_tiles(
        center_lat=OFFICE_LAT,
        center_lng=OFFICE_LNG,
        outer_radius_meters=OUTER_RADIUS_M,
        search_radius_meters=TILE_SEARCH_RADIUS_M,
    )
    print(f"Tiles: {len(tiles)} (= {len(tiles)} Nearby Search calls)\n")

    # Discovery: Nearby Search per tile, collecting unique place IDs.
    place_ids: set[str] = set()
    for i, tile in enumerate(tiles, start=1):
        res = client.nearby_search(
            latitude=tile.latitude,
            longitude=tile.longitude,
            radius_meters=TILE_SEARCH_RADIUS_M,
            included_types=INCLUDED_TYPES,
        )
        found = res.get("places", []) or []
        for p in found:
            place_ids.add(p["id"])
        print(
            f"Tile {i}/{len(tiles)}: +{len(found)} hits "
            f"({len(place_ids)} unique)"
        )
        if len(found) == 20:
            print("  warn: hit 20-result cap; some restaurants may be missed")

    # Details fan-out, skipping anything the checkpoint already has.
    to_fetch = [pid for pid in sorted(place_ids) if pid not in already_fetched]
    print(
        f"\nDetails phase: {len(to_fetch)} to fetch, "
        f"{len(already_fetched)} cached."
    )

    # `details` accumulates everything that should land in the final file
    # (cached + newly fetched). Writes happen after each successful fetch so
    # a crash mid-run never wastes paid-for data.
    details: list[dict[str, Any]] = list(existing_places)

    for i, pid in enumerate(to_fetch, start=1):
        try:
            d = client.get_place_details(pid)
        except Exception as err:
            print(f"  Failed {pid}: {err}")
            continue
        details.append(d)
        payload = _build_payload(
            run_at=datetime.now(timezone.utc).isoformat(),
            tile_count=len(tiles),
            # union of newly-discovered IDs and anything the checkpoint had
            unique_place_ids=len(place_ids | already_fetched),
            places=details,
        )
        _atomic_write_json(out_path, payload)
        if i % 25 == 0 or i == len(to_fetch):
            print(f"  {i}/{len(to_fetch)} (total in file: {len(details)})")

    # Final write -- covers the no-new-fetch case (resume of an already-complete
    # run) where the loop above never ran.
    if not to_fetch:
        payload = _build_payload(
            run_at=datetime.now(timezone.utc).isoformat(),
            tile_count=len(tiles),
            unique_place_ids=len(place_ids | already_fetched),
            places=details,
        )
        _atomic_write_json(out_path, payload)

    print(f"\nDone. {len(details)} places in {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
