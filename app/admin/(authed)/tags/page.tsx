import { desc, eq } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import { restaurants, tagMarks } from "@/src/db/schema";

import { TagRowActions } from "./TagRowActions";

export default async function AdminTagsPage() {
  const db = getDb();
  const rows = db
    .select({
      browserId: tagMarks.browserId,
      placeId: tagMarks.placeId,
      placeName: restaurants.name,
      attribute: tagMarks.attribute,
      displayName: tagMarks.displayName,
      createdAt: tagMarks.createdAt,
    })
    .from(tagMarks)
    .leftJoin(restaurants, eq(tagMarks.placeId, restaurants.placeId))
    .orderBy(desc(tagMarks.createdAt))
    .limit(500)
    .all();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-teal-900">Tags</h1>
      <p className="text-sm text-teal-700/80">
        Most-recent 500. Tags are public on toggle — this view is for
        moderating after the fact.
      </p>

      <div className="overflow-x-auto rounded-lg border border-teal-700/15 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-teal-700/10 bg-teal-50/40 text-left text-xs uppercase tracking-wide text-teal-700/70">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Restaurant</th>
              <th className="px-3 py-2">Attribute</th>
              <th className="px-3 py-2">Tagger</th>
              <th className="w-24 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={`${r.browserId}:${r.placeId}:${r.attribute}`}
                className="border-b border-teal-700/5 last:border-0 hover:bg-teal-50/30"
              >
                <td className="whitespace-nowrap px-3 py-2 text-xs text-teal-700/70">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-teal-800">{r.placeName ?? r.placeId}</td>
                <td className="px-3 py-2 text-teal-900">{r.attribute}</td>
                <td className="px-3 py-2 text-teal-800">
                  <div>{r.displayName}</div>
                  <div className="font-mono text-[10px] text-teal-700/50">
                    {r.browserId.slice(0, 8)}…
                  </div>
                </td>
                <td className="px-3 py-2">
                  <TagRowActions
                    browserId={r.browserId}
                    placeId={r.placeId}
                    attribute={r.attribute}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm text-teal-700/60">
                  No tags yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
