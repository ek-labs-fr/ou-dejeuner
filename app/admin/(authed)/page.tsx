import { sql } from "drizzle-orm";
import Link from "next/link";

import { getDb } from "@/src/db/client";
import {
  bannedBrowserIds,
  closureReports,
  comments,
  reactions,
  restaurants,
  submissions,
  tagMarks,
} from "@/src/db/schema";

export default async function AdminOverviewPage() {
  const db = getDb();
  const [
    pendingSubmissions,
    openIssueReports,
    totalRestaurants,
    hiddenRestaurants,
    totalComments,
    totalReactions,
    totalTags,
    totalBans,
  ] = [
    db.select({ n: sql<number>`count(*)` })
      .from(submissions)
      .where(sql`${submissions.status} = 'pending'`)
      .get()?.n ?? 0,
    db.select({ n: sql<number>`count(*)` })
      .from(closureReports)
      .where(sql`${closureReports.status} = 'open'`)
      .get()?.n ?? 0,
    db.select({ n: sql<number>`count(*)` }).from(restaurants).get()?.n ?? 0,
    db.select({ n: sql<number>`count(*)` })
      .from(restaurants)
      .where(sql`${restaurants.isHidden} = 1`)
      .get()?.n ?? 0,
    db.select({ n: sql<number>`count(*)` }).from(comments).get()?.n ?? 0,
    db.select({ n: sql<number>`count(*)` }).from(reactions).get()?.n ?? 0,
    db.select({ n: sql<number>`count(*)` }).from(tagMarks).get()?.n ?? 0,
    db.select({ n: sql<number>`count(*)` }).from(bannedBrowserIds).get()?.n ?? 0,
  ];

  const tiles = [
    { label: "Pending submissions", value: pendingSubmissions, href: "/admin/submissions", emphasize: pendingSubmissions > 0 },
    { label: "Open issue reports", value: openIssueReports, href: "/admin/issues", emphasize: openIssueReports > 0 },
    { label: "Restaurants", value: totalRestaurants, href: "/admin/restaurants", sub: `${hiddenRestaurants} hidden` },
    { label: "Comments", value: totalComments, href: "/admin/comments" },
    { label: "Reactions", value: totalReactions, href: "/admin/votes" },
    { label: "Tags", value: totalTags, href: "/admin/tags" },
    { label: "Bans", value: totalBans, href: "/admin/bans" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-teal-900">Overview</h1>
        <p className="mt-1 text-sm text-teal-700/80">
          Single-admin v1. Every action is recorded in the audit log.
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className={`block rounded-xl border p-4 transition hover:-translate-y-0.5 ${
                t.emphasize
                  ? "border-copper-400 bg-copper-50 hover:border-copper-600"
                  : "border-teal-700/15 bg-white hover:border-teal-700/40"
              }`}
            >
              <div className="text-xs uppercase tracking-wide text-teal-700/70">
                {t.label}
              </div>
              <div className="mt-1 text-3xl font-semibold tabular-nums text-teal-900">
                {t.value}
              </div>
              {t.sub && (
                <div className="mt-1 text-xs text-teal-700/60">{t.sub}</div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
