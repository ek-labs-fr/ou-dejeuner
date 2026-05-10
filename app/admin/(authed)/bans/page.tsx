import { desc } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import { bannedBrowserIds } from "@/src/db/schema";

import { BanForm, BanRowActions } from "./BanRowActions";

export default async function AdminBansPage() {
  const db = getDb();
  const rows = db
    .select()
    .from(bannedBrowserIds)
    .orderBy(desc(bannedBrowserIds.bannedAt))
    .all();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-teal-900">Bans</h1>
      <p className="text-sm text-teal-700/80">
        Banned browser IDs are blocked from voting, commenting, tagging, and
        submitting. Use “wipe content” after banning to remove their existing
        contributions.
      </p>

      <BanForm />

      <div className="overflow-x-auto rounded-lg border border-teal-700/15 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-teal-700/10 bg-teal-50/40 text-left text-xs uppercase tracking-wide text-teal-700/70">
            <tr>
              <th className="px-3 py-2">Browser ID</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Banned</th>
              <th className="w-48 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.browserId}
                className="border-b border-teal-700/5 last:border-0 hover:bg-teal-50/30"
              >
                <td className="px-3 py-2 font-mono text-xs text-teal-900">
                  {r.browserId}
                </td>
                <td className="px-3 py-2 text-teal-800">{r.reason ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-teal-700/70">
                  {new Date(r.bannedAt).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <BanRowActions browserId={r.browserId} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-teal-700/60">
                  No bans.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
