import { desc, eq } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import { comments, restaurants } from "@/src/db/schema";

import { CommentRowActions } from "./CommentRowActions";

export default async function AdminCommentsPage() {
  const db = getDb();
  const rows = db
    .select({
      id: comments.id,
      placeId: comments.placeId,
      placeName: restaurants.name,
      displayName: comments.displayName,
      browserId: comments.browserId,
      body: comments.body,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .leftJoin(restaurants, eq(comments.placeId, restaurants.placeId))
    .orderBy(desc(comments.createdAt))
    .all();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-teal-900">Comments</h1>
      <p className="text-sm text-teal-700/80">
        {rows.length} comment{rows.length === 1 ? "" : "s"} across all
        restaurants. Hard delete — no recovery.
      </p>

      <div className="overflow-x-auto rounded-lg border border-teal-700/15 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-teal-700/10 bg-teal-50/40 text-left text-xs uppercase tracking-wide text-teal-700/70">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Restaurant</th>
              <th className="px-3 py-2">Author</th>
              <th className="px-3 py-2">Comment</th>
              <th className="w-24 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-teal-700/5 align-top last:border-0 hover:bg-teal-50/30"
              >
                <td className="whitespace-nowrap px-3 py-2 text-xs text-teal-700/70">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-teal-800">{r.placeName ?? r.placeId}</td>
                <td className="px-3 py-2 text-teal-800">
                  <div>{r.displayName}</div>
                  <div className="font-mono text-[10px] text-teal-700/50">
                    {r.browserId.slice(0, 8)}…
                  </div>
                </td>
                <td className="px-3 py-2 text-teal-900">
                  <div className="max-w-md whitespace-pre-wrap">{r.body}</div>
                </td>
                <td className="px-3 py-2">
                  <CommentRowActions id={r.id} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm text-teal-700/60">
                  No comments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
