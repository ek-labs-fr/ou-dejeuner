"""Audit data/restaurants.json and tag places that look like non-lunch options.

Reads `data/restaurants.json`, computes audit tags per place, writes
`data/restaurants-audited.json` (full mirror with an `audit` block added per
place). Original file is never modified.

The audit assigns each suspect a severity:
- "high"   -> exclude_recommend: true. Defaults that admin can override.
- "medium" -> flagged for review; not auto-excluded.
- "low"    -> informational; surfaces edge cases.

Re-run any time. Idempotent.
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from places import humanize_type, type_icon

# Google Places v1 weekday numbering: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
WEEKDAYS = {1, 2, 3, 4, 5}

# Lunch window in local time (the API returns local time per place's timezone).
LUNCH_OPEN_MIN = 12 * 60       # 12:00
LUNCH_CLOSE_MIN = 14 * 60      # 14:00

HIGH_PRIMARY_EXCLUDES = {
    "hotel": "hotel_primary",
    "supermarket": "supermarket_primary",
}

MEDIUM_PRIMARY_TAGS = {
    "bar": "bar_primary",
    "wine_bar": "bar_primary",
    "cocktail_bar": "bar_primary",
    "pub": "bar_primary",
    "sports_bar": "bar_primary",
    "brewery": "bar_primary",
    "brewpub": "bar_primary",
    "dessert_shop": "dessert_primary",
    "ice_cream_shop": "dessert_primary",
    "chocolate_shop": "dessert_primary",
    "donut_shop": "dessert_primary",
    "cake_shop": "dessert_primary",
    "food_delivery": "delivery_only",
    "meal_delivery": "delivery_only",
    "tea_house": "tea_house_primary",
    "night_club": "nightclub_primary",
}

LOW_PRIMARY_TAGS = {
    "pastry_shop": "pastry_primary",
    "coffee_shop": "coffee_shop_primary",
    "cafe": "cafe_primary",
    "confectionery": "confectionery_primary",
}

SEVERITY_RANK = {"high": 3, "medium": 2, "low": 1}


def _open_during_weekday_lunch(periods: list[dict[str, Any]]) -> bool:
    """True if any period overlaps the 12:00-14:00 window on a weekday."""
    for period in periods:
        open_ = period.get("open") or {}
        close = period.get("close") or {}
        day = open_.get("day")
        if day not in WEEKDAYS:
            continue
        open_min = open_.get("hour", 0) * 60 + open_.get("minute", 0)
        # Missing close => 24-hour place; treat as open through end of day.
        if close:
            close_day = close.get("day", day)
            close_min = close.get("hour", 0) * 60 + close.get("minute", 0)
            if close_day != day:
                # Overnight period (e.g. opens Tue 22:00, closes Wed 02:00).
                # Anything starting before 14:00 same-day still counts; otherwise
                # treat as not-lunch (overnight closes don't help lunch crowds).
                close_min = 24 * 60
        else:
            close_min = 24 * 60
        if open_min < LUNCH_CLOSE_MIN and close_min > LUNCH_OPEN_MIN:
            return True
    return False


def audit_place(p: dict[str, Any]) -> dict[str, Any]:
    tags: list[str] = []

    # HIGH severity ------------------------------------------------------------
    if p.get("businessStatus") == "CLOSED_TEMPORARILY":
        tags.append("closed_temporarily")
    primary = p.get("primaryType")
    if primary in HIGH_PRIMARY_EXCLUDES:
        tags.append(HIGH_PRIMARY_EXCLUDES[primary])

    # MEDIUM severity ----------------------------------------------------------
    if primary in MEDIUM_PRIMARY_TAGS:
        tags.append(MEDIUM_PRIMARY_TAGS[primary])

    hours = p.get("regularOpeningHours")
    if hours:
        periods = hours.get("periods") or []
        if periods and not _open_during_weekday_lunch(periods):
            tags.append("not_open_weekday_lunch")

    # LOW severity -------------------------------------------------------------
    if not hours:
        tags.append("no_opening_hours")
    if primary in LOW_PRIMARY_TAGS:
        tags.append(LOW_PRIMARY_TAGS[primary])

    # Severity = max severity across tags.
    severity = None
    for tag in tags:
        if tag in {"closed_temporarily", "hotel_primary", "supermarket_primary"}:
            tag_sev = "high"
        elif tag in {"no_opening_hours"} | set(LOW_PRIMARY_TAGS.values()):
            tag_sev = "low"
        else:
            tag_sev = "medium"
        if severity is None or SEVERITY_RANK[tag_sev] > SEVERITY_RANK[severity]:
            severity = tag_sev

    return {
        "tags": tags,
        "severity": severity,
        "exclude_recommend": severity == "high",
    }


def main() -> int:
    project_root = Path(__file__).resolve().parent.parent
    src = project_root / "data" / "restaurants.json"
    dst = project_root / "data" / "restaurants-audited.json"

    if not src.exists():
        print(f"missing {src}", file=sys.stderr)
        return 1

    payload = json.loads(src.read_text(encoding="utf-8"))
    places = payload.get("places", [])

    audited = []
    severity_counts: Counter[str] = Counter()
    tag_counts: Counter[str] = Counter()
    excludes_by_primary: Counter[str] = Counter()

    for place in places:
        audit = audit_place(place)
        primary = place.get("primaryType")
        types = place.get("types", [])
        out = dict(place)
        out["primaryTypeLabel"] = humanize_type(primary)
        out["primaryTypeIcon"] = type_icon(primary)
        out["typesLabels"] = [humanize_type(t) for t in types]
        out["typesIcons"] = [type_icon(t) for t in types]
        out["audit"] = audit
        audited.append(out)

        severity_counts[audit["severity"] or "clean"] += 1
        for t in audit["tags"]:
            tag_counts[t] += 1
        if audit["exclude_recommend"]:
            excludes_by_primary[place.get("primaryType", "?")] += 1

    out_payload = dict(payload)
    out_payload["places"] = audited
    out_payload["auditSummary"] = {
        "totalPlaces": len(places),
        "severityCounts": dict(severity_counts),
        "tagCounts": dict(tag_counts),
        "excludeRecommendCount": severity_counts["high"],
        "excludeRecommendByPrimaryType": dict(excludes_by_primary),
    }

    dst.write_text(
        json.dumps(out_payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"Audited {len(places)} places -> {dst.relative_to(project_root)}\n")
    print("Severity:")
    for s in ("high", "medium", "low", "clean"):
        print(f"  {s:8s} {severity_counts[s]:5d}")
    print("\nTag counts:")
    for t, c in tag_counts.most_common():
        print(f"  {c:5d}  {t}")
    print(f"\nexclude_recommend = true: {severity_counts['high']} places")
    print("  by primaryType:")
    for k, v in excludes_by_primary.most_common():
        print(f"    {v:5d}  {k}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
