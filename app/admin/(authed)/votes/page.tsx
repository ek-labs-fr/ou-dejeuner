import { desc, eq } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import { reactions, restaurants } from "@/src/db/schema";

import { ReactionRowActions } from "./ReactionRowActions";

export default async function AdminVotesPage() {
  const db = getDb();
  const rows = db
    .select({
      browserId: reactions.browserId,
      placeId: reactions.placeId,
      placeName: restaurants.name,
      kind: reactions.kind,
      displayName: reactions.displayName,
      createdAt: reactions.createdAt,
      updatedAt: reactions.updatedAt,
    })
    .from(reactions)
    .leftJoin(restaurants, eq(reactions.placeId, restaurants.placeId))
    .orderBy(desc(reactions.updatedAt))
    .limit(500)
    .all();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-teal-900">Reactions</h1>
      <p className="text-sm text-teal-700/80">
        Most-recent 500. Delete to clean up obvious abuse.
      </p>

      <div className="overflow-x-auto rounded-lg border border-teal-700/15 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-teal-700/10 bg-teal-50/40 text-left text-xs uppercase tracking-wide text-teal-700/70">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Restaurant</th>
              <th className="px-3 py-2">Kind</th>
              <th className="px-3 py-2">Author</th>
              <th className="w-24 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={`${r.browserId}:${r.placeId}`}
                className="border-b border-teal-700/5 last:border-0 hover:bg-teal-50/30"
              >
                <td className="whitespace-nowrap px-3 py-2 text-xs text-teal-700/70">
                  {new Date(r.updatedAt).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-teal-800">{r.placeName ?? r.placeId}</td>
                <td className="px-3 py-2 text-teal-900">
                  {r.kind === "love" ? "❤️" : "👍"}
                </td>
                <td className="px-3 py-2 text-teal-800">
                  <div>{r.displayName}</div>
                  <div className="font-mono text-[10px] text-teal-700/50">
                    {r.browserId.slice(0, 8)}…
                  </div>
                </td>
                <td className="px-3 py-2">
                  <ReactionRowActions browserId={r.browserId} placeId={r.placeId} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm text-teal-700/60">
                  No reactions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
