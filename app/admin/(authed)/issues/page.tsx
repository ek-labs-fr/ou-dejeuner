import { desc, eq } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import { closureReports, restaurants } from "@/src/db/schema";

import { IssueRowActions } from "./IssueRowActions";

export default async function AdminIssuesPage() {
  const db = getDb();
  const rows = db
    .select({
      id: closureReports.id,
      placeId: closureReports.placeId,
      placeName: restaurants.name,
      isHidden: restaurants.isHidden,
      issueType: closureReports.issueType,
      note: closureReports.note,
      displayName: closureReports.displayName,
      browserId: closureReports.browserId,
      reportedAt: closureReports.reportedAt,
    })
    .from(closureReports)
    .leftJoin(restaurants, eq(closureReports.placeId, restaurants.placeId))
    .where(eq(closureReports.status, "open"))
    .orderBy(desc(closureReports.reportedAt))
    .all();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-teal-900">Issue reports</h1>
      <p className="text-sm text-teal-700/80">
        Open reports only. Resolve by hiding the restaurant or dismiss to
        leave it visible.
      </p>

      <div className="overflow-x-auto rounded-lg border border-teal-700/15 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-teal-700/10 bg-teal-50/40 text-left text-xs uppercase tracking-wide text-teal-700/70">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Restaurant</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Note</th>
              <th className="px-3 py-2">Reporter</th>
              <th className="w-44 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-teal-700/5 align-top last:border-0 hover:bg-teal-50/30"
              >
                <td className="whitespace-nowrap px-3 py-2 text-xs text-teal-700/70">
                  {new Date(r.reportedAt).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-teal-800">
                  {r.placeName ?? r.placeId}
                  {r.isHidden && (
                    <span className="ml-2 rounded bg-copper-100 px-1.5 py-0.5 text-[10px] font-medium text-copper-800">
                      already hidden
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-teal-900">{r.issueType}</td>
                <td className="px-3 py-2 text-teal-800">
                  <div className="max-w-sm whitespace-pre-wrap">{r.note ?? "—"}</div>
                </td>
                <td className="px-3 py-2 text-teal-800">
                  <div>{r.displayName}</div>
                  <div className="font-mono text-[10px] text-teal-700/50">
                    {r.browserId.slice(0, 8)}…
                  </div>
                </td>
                <td className="px-3 py-2">
                  <IssueRowActions id={r.id} alreadyHidden={r.isHidden ?? false} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-teal-700/60">
                  No open reports.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
