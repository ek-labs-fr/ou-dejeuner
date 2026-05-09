"""1-tile trial run for Ou Dejeuner Google Places ingestion.

Calls Nearby Search once + Place Details for each unique place_id returned.
Writes results to scripts/trial-output.json for inspection.

Worst-case API cost (no free quota applied): ~$0.37
  1 Nearby Search Pro ($32/1k) + 20 Place Details Pro ($17/1k).
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

# Make the sibling `places` module importable when run as a script.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from places import PlacesClient

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


LAT = _read_coord("OFFICE_LAT")
LNG = _read_coord("OFFICE_LNG")
RADIUS_METERS = 300


def main() -> int:
    project_root = Path(__file__).resolve().parent.parent
    load_dotenv(project_root / ".env")

    api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
    if not api_key:
        print(
            "GOOGLE_PLACES_API_KEY not set (and not found in .env).",
            file=sys.stderr,
        )
        return 1

    print("== Ou Dejeuner -- 1-tile Places API trial ==")
    print(f"Center: {LAT}, {LNG}")
    print(f"Radius: {RADIUS_METERS} m\n")

    client = PlacesClient(api_key)

    print("[1/2] Nearby Search...")
    nearby = client.nearby_search(
        latitude=LAT,
        longitude=LNG,
        radius_meters=RADIUS_METERS,
    )
    places = nearby.get("places", []) or []
    print(f"  Found {len(places)} places.\n")
    if not places:
        print("No places returned. Try a wider radius or different coords.")
        return 0

    print("[2/2] Place Details...")
    details_results: list[dict] = []
    output_path = Path(__file__).resolve().parent / "trial-output.json"

    for place in places:
        place_id = place["id"]
        name = place.get("displayName", {}).get("text", "(no name)")
        print(f"  -> {name} ({place_id})")
        try:
            details = client.get_place_details(place_id)
            details_results.append(details)
            # Snapshot to disk after each successful fetch so a crash mid-run
            # leaves a usable artefact.
            snapshot = {
                "runAt": datetime.now(timezone.utc).isoformat(),
                "center": {"latitude": LAT, "longitude": LNG},
                "radiusMeters": RADIUS_METERS,
                "placesFound": len(places),
                "detailsRetrieved": len(details_results),
                "nearbyResponse": nearby,
                "detailsResponses": details_results,
            }
            output_path.write_text(
                json.dumps(snapshot, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
        except Exception as err:
            print(f"    Failed to fetch: {err}")

    print(f"\nDone. Results written to: {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
