import { redirect } from "next/navigation";

import { getAdminPayload } from "@/lib/admin-gate-server";

import { unlockAdmin } from "./actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  // Already logged in — go straight to the destination.
  const payload = await getAdminPayload();
  if (payload) redirect(safeNext(next ?? "/admin"));

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-50 px-4 py-10">
      <div className="w-full max-w-sm space-y-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <span aria-hidden className="text-3xl">🛠️</span>
          <h1 className="text-2xl font-semibold tracking-tight text-teal-800">
            Admin
          </h1>
          <p className="text-sm text-teal-700/80">
            Enter the admin password to continue.
          </p>
        </div>

        <form
          action={unlockAdmin}
          className="space-y-3 rounded-2xl border border-copper-200/60 bg-white/80 p-5 shadow-sm"
        >
          <input type="hidden" name="next" value={next ?? "/admin"} />
          <label className="block text-xs font-semibold uppercase tracking-wide text-copper-600">
            Password
            <input
              type="password"
              name="password"
              required
              autoFocus
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-teal-700/20 bg-white px-3 py-2 text-base text-teal-900 outline-none transition focus:border-copper-500 focus:ring-2 focus:ring-copper-300/40"
            />
          </label>

          {error === "invalid" && (
            <p className="text-sm text-copper-700" role="alert">
              That password didn’t match. Try again.
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-teal-800 active:scale-[0.99]"
          >
            Unlock
          </button>
        </form>
      </div>
    </main>
  );
}

function safeNext(raw: string): string {
  if (!raw.startsWith("/admin")) return "/admin";
  if (raw.startsWith("//")) return "/admin";
  return raw;
}
