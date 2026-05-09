"""Add `primaryTypeLabel` and `typesLabels` to every place in restaurants.json.

One-shot enrichment for the existing seeded catalogue. Idempotent — safe to
re-run; existing label fields are overwritten with freshly-computed values
(so a tweak to humanize_type() can be propagated by re-running this).

Atomic write via temp + os.replace so a crash mid-write never leaves a
half-truncated file.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from places import humanize_type, type_icon


def main() -> int:
    project_root = Path(__file__).resolve().parent.parent
    path = project_root / "data" / "restaurants.json"

    if not path.exists():
        print(f"missing {path}", file=sys.stderr)
        return 1

    payload = json.loads(path.read_text(encoding="utf-8"))
    places = payload.get("places", [])

    for place in places:
        primary = place.get("primaryType")
        types = place.get("types", [])
        place["primaryTypeLabel"] = humanize_type(primary)
        place["primaryTypeIcon"] = type_icon(primary)
        place["typesLabels"] = [humanize_type(t) for t in types]
        place["typesIcons"] = [type_icon(t) for t in types]

    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    os.replace(tmp, path)

    print(f"Enriched {len(places)} places in {path.relative_to(project_root)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
