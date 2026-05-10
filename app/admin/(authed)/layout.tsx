import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAdmin } from "@/app/admin/login/actions";
import { getAdminPayload } from "@/lib/admin-gate-server";

const NAV: { href: string; label: string }[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/restaurants", label: "Restaurants" },
  { href: "/admin/comments", label: "Comments" },
  { href: "/admin/votes", label: "Votes" },
  { href: "/admin/tags", label: "Tags" },
  { href: "/admin/issues", label: "Issue reports" },
  { href: "/admin/bans", label: "Bans" },
  { href: "/admin/audit", label: "Audit log" },
];

export default async function AdminAuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const payload = await getAdminPayload();
  if (!payload) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="border-b border-teal-700/20 bg-teal-800 text-cream-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span aria-hidden>🛠️</span>
            <span className="text-sm font-semibold uppercase tracking-wider">
              Où Déjeuner · Admin
            </span>
          </div>
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="rounded-md border border-cream-50/30 px-2 py-1 text-xs font-medium text-cream-50/90 transition hover:bg-cream-50/10"
            >
              Sign out
            </button>
          </form>
        </div>
        <nav className="mx-auto max-w-6xl overflow-x-auto px-4 pb-2">
          <ul className="flex gap-1 text-sm">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="block whitespace-nowrap rounded-md px-3 py-1.5 text-cream-50/80 transition hover:bg-cream-50/10 hover:text-cream-50"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
