# Où Déjeuner

Internal lunch-picker for ~50 colleagues at the office (anchor configured via OFFICE_LAT / OFFICE_LNG env vars). Office-password-gated, single admin. Pre-launch, pre-infrastructure.

## Source-of-truth docs

- `document/product-requirements-v2.md` — current product spec. Supersedes `product-requirements.md`.
- `document/technical-requirements.md` — infra / stack decisions.

## Current state

- **Ingestion (Python):**
  - `scripts/places.py` — shared `PlacesClient` + tile-grid generator + haversine.
  - `scripts/trial_places.py` — 1-tile probe → `scripts/trial-output.json`.
  - `scripts/seed_places.py` — full grid → `data/restaurants.json`. Per-place checkpointed via atomic temp-file writes; safe to crash + resume.
  - `requirements.txt` — `requests`, `python-dotenv`. Python 3.10+.
- **DB schema (scaffold, not yet running):**
  - `src/db/schema.ts` — Drizzle SQLite schema; the target shape for the eventual JSON→SQLite migration.
  - `src/db/client.ts` — `better-sqlite3` driver with WAL pragmas.
- **Not yet built:** Next.js app, EC2 / VPC / Cloudflare, Litestream, JSON→SQLite migration script.

## Key architectural decisions

| Decision | Why |
|---|---|
| **SQLite + Litestream** (not Postgres) | Single-VM, ~50 concurrent users — embedded DB is simpler and frees ~150–300 MB of RAM. User pivoted from Postgres after assessment. |
| **Python ingestion writing JSON** (not TS) | One-off seed; "keep it simple". No Drizzle dependency for the seed. |
| **JSON as interim catalogue storage** | Frontend reads it directly; ~3k places fit in memory. Migration to SQLite happens when user-data features (votes, submissions) need persistent writes. |
| **Drizzle ORM** | Less magic than Prisma, no separate generation step. |
| **Haversine × 1.3 / 80 m/min** for walking time | Distance Matrix API costs $5/1k and adds nothing at the ±2-min resolution users care about. |
| **No photos in v1** | Enterprise SKU on Places API; scope-cut. |
| **Cloudflare proxy + Let's Encrypt origin** | CloudFront blocked on this AWS account. |
| **`place_id` as the universal join key** | Stable across renames/relocations. Every table (catalogue, votes, submissions) keys on it — no surrogate IDs. |

## Running the ingestion

```pwsh
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

python scripts/trial_places.py        # 1-tile probe; ~$0.37 worst case
python scripts/seed_places.py         # full grid; ~$50 actual (2026-05-03 run, no free caps on this billing account). One-off — not re-run on a schedule.
```

The seed is **resumable** — re-running skips already-fetched places via the `data/restaurants.json` checkpoint. Changing `OFFICE_LAT/LNG`? Move the old file aside first; the script refuses to merge across anchors.

## Google Places API — billing notes

- **This billing account has no free caps.** Every call is billed at full pay-as-you-go: Nearby Search Pro $32/1k, Place Details Pro $17/1k. The 5,000/mo per-SKU free tier that applies to most accounts does *not* apply here — confirmed by the $50 invoice for the 2026-05-03 seed.
- **Field mask = Essentials + Pro.** `regularOpeningHours` and `priceLevel` are the Pro-tier fields; together they pin the whole Place Details call at Pro. Adding Enterprise fields (photos, reviews) bumps the SKU and is out of scope.
- **Seed is one-off, not monthly.** Deliberate deviation from Google's 30-day TOS cache limit, accepted to keep recurring API spend at $0. New openings come in via user submissions (~$0.02/approval); closures via "report as closed" + admin hide. Gradual catalogue staleness for renames/relocations is the accepted trade.
- **Hard cap considerations:** GCP Billing Budgets are *alerts only*. For a real cap, set per-API daily quotas in the GCP Console (e.g. 150 Nearby + 280 Details ≈ $5/day ceiling).

## Conventions / gotchas

- **`.env` holds the live `GOOGLE_PLACES_API_KEY`.** Gitignored. Don't echo it in code, logs, or tool output.
- **No `pg_dump`, no Postgres.** Tech-req used to specify them; both are gone. SQLite + Litestream WAL replication to S3 replaces both.
- **Filtering is server-side, in-memory.** ~3k records; no need to push filtering into SQL or the client.
- **Re-using `place_id`s across runs is intentional** — the seed upserts, never replaces. Preserve `first_seen_at` semantics when writing the migration.

## Working preferences

- User pushes back on premature complexity. Default to the simpler option; add structure only when the simpler option breaks.
- Confirm before destructive actions (deletes, schema rewrites, force-pushes).
- Cost framing is load-bearing — surface dollar figures explicitly when relevant.
