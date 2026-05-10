import { desc } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import { adminAuditLog } from "@/src/db/schema";

export default async function AdminAuditPage() {
  const db = getDb();
  const rows = db
    .select()
    .from(adminAuditLog)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(500)
    .all();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-teal-900">Audit log</h1>
      <p className="text-sm text-teal-700/80">
        Most-recent 500 admin actions. Append-only — there's no UI to delete
        rows.
      </p>

      <div className="overflow-x-auto rounded-lg border border-teal-700/15 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-teal-700/10 bg-teal-50/40 text-left text-xs uppercase tracking-wide text-teal-700/70">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Details</th>
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
                <td className="px-3 py-2 font-mono text-xs text-teal-900">
                  {r.action}
                </td>
                <td className="px-3 py-2 text-teal-800">
                  {r.targetType ? (
                    <>
                      <div className="text-xs text-teal-700/70">{r.targetType}</div>
                      <div className="font-mono text-xs">{r.targetId}</div>
                    </>
                  ) : (
                    <span className="text-teal-700/40">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {r.payload ? (
                    <pre className="max-w-md overflow-x-auto whitespace-pre-wrap break-all text-[11px] text-teal-700/80">
                      {JSON.stringify(r.payload, null, 0)}
                    </pre>
                  ) : (
                    <span className="text-teal-700/40">—</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-teal-700/60">
                  No actions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
