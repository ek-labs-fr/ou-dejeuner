import { asc } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import { restaurants } from "@/src/db/schema";
import { MAX_WALK_MIN, walkMinutesFromOffice } from "@/lib/walking";

import { RestaurantRowActions } from "./RestaurantRowActions";

export default async function AdminRestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim();
  const qLower = q.toLowerCase();

  const db = getDb();
  const allRows = db
    .select({
      placeId: restaurants.placeId,
      name: restaurants.name,
      address: restaurants.address,
      latitude: restaurants.latitude,
      longitude: restaurants.longitude,
      primaryTypeLabel: restaurants.primaryTypeLabel,
      source: restaurants.source,
      isHidden: restaurants.isHidden,
      newBadgeOverride: restaurants.newBadgeOverride,
      overrideDineIn: restaurants.overrideDineIn,
      overrideTakeaway: restaurants.overrideTakeaway,
      overrideVegetarian: restaurants.overrideVegetarian,
      overrideHalal: restaurants.overrideHalal,
      approvedAt: restaurants.approvedAt,
    })
    .from(restaurants)
    .orderBy(asc(restaurants.name))
    .all();

  // Match the public catalogue's walking-time cap. Filtering in JS — the
  // catalogue is small enough that a SQL bbox isn't worth it.
  const inWalkRange = allRows.filter(
    (r) => walkMinutesFromOffice(r.latitude, r.longitude) <= MAX_WALK_MIN,
  );

  const rows = q
    ? inWalkRange.filter(
        (r) =>
          r.name.toLowerCase().includes(qLower) ||
          r.address.toLowerCase().includes(qLower),
      )
    : inWalkRange;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-teal-900">Restaurants</h1>
        <p className="mt-1 text-sm text-teal-700/80">
          {rows.length} of {inWalkRange.length} within {MAX_WALK_MIN} min walk
          {q && ` matching "${q}"`}. Hidden rows still shown here so you can
          unhide; they disappear from the public list entirely.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name or address…"
          className="w-full max-w-sm rounded-md border border-teal-700/20 bg-white px-3 py-1.5 text-sm text-teal-900 outline-none focus:border-copper-500 focus:ring-2 focus:ring-copper-300/40"
        />
        <button
          type="submit"
          className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-semibold text-cream-50 transition hover:bg-teal-800"
        >
          Search
        </button>
        {q && (
          <a
            href="/admin/restaurants"
            className="rounded-md border border-teal-700/30 px-3 py-1.5 text-sm font-medium text-teal-800 transition hover:border-teal-700"
          >
            Clear
          </a>
        )}
      </form>

      <div className="overflow-x-auto rounded-lg border border-teal-700/15 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-teal-700/10 bg-teal-50/40 text-left text-xs uppercase tracking-wide text-teal-700/70">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Cuisine</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Overrides</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.placeId}
                className="border-b border-teal-700/5 align-top last:border-0 hover:bg-teal-50/30"
              >
                <td className="px-3 py-2">
                  <div className="text-teal-900">{r.name}</div>
                  <div className="text-xs text-teal-700/60">{r.address}</div>
                </td>
                <td className="px-3 py-2 text-teal-800">
                  {r.primaryTypeLabel ?? "—"}
                </td>
                <td className="px-3 py-2 text-teal-800">
                  {r.source}
                  {r.source === "submitted" && r.approvedAt && (
                    <div className="text-[10px] text-teal-700/60">
                      {new Date(r.approvedAt).toLocaleDateString()}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  {r.isHidden ? (
                    <span className="rounded bg-copper-100 px-2 py-0.5 text-xs font-medium text-copper-800">
                      Hidden
                    </span>
                  ) : (
                    <span className="text-xs text-teal-700/60">Visible</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <RestaurantRowActions
                    placeId={r.placeId}
                    name={r.name}
                    isHidden={r.isHidden}
                    newBadgeOverride={r.newBadgeOverride}
                    overrideDineIn={r.overrideDineIn}
                    overrideTakeaway={r.overrideTakeaway}
                    overrideVegetarian={r.overrideVegetarian}
                    overrideHalal={r.overrideHalal}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm text-teal-700/60">
                  {q ? "No matches." : "No restaurants within walking range."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
