"""List the unique icon set used by `type_icon()`.

Inverts the CUISINE_FLAGS + TYPE_ICONS maps to icon -> [type tokens that
resolve to it]. Useful for spot-checking that no two unrelated types
accidentally collide on the same emoji, and for seeing the full icon palette.

Writes `data/icons-summary.txt` (UTF-8) so the output renders correctly even
on Windows consoles that can't print emoji.
"""
from __future__ import annotations

import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from places import CUISINE_FLAGS, TYPE_ICONS, type_icon


def main() -> int:
    project_root = Path(__file__).resolve().parent.parent
    out_path = project_root / "data" / "icons-summary.txt"

    icon_to_types: dict[str, list[str]] = defaultdict(list)

    for raw, _ in TYPE_ICONS.items():
        icon = type_icon(raw)
        if icon:
            icon_to_types[icon].append(raw)

    for cuisine, _ in CUISINE_FLAGS.items():
        raw = f"{cuisine}_restaurant"
        icon = type_icon(raw)
        if icon:
            icon_to_types[icon].append(raw)

    lines = []
    lines.append(f"Unique icons in use: {len(icon_to_types)}")
    lines.append(f"Total tokens mapped: {sum(len(v) for v in icon_to_types.values())}\n")
    lines.append("By usage count (most-reused first):\n")

    for icon, types in sorted(
        icon_to_types.items(), key=lambda kv: (-len(kv[1]), kv[0])
    ):
        lines.append(f"{icon}  ({len(types)})  {', '.join(sorted(types))}")

    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {out_path.relative_to(project_root)}")
    print(f"  {len(icon_to_types)} unique icons across "
          f"{sum(len(v) for v in icon_to_types.values())} type tokens")
    return 0


if __name__ == "__main__":
    sys.exit(main())
