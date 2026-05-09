import { unlockGate } from "./actions";
import { StorageProbe } from "./StorageProbe";

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-50 px-4 py-10">
      <div className="w-full max-w-sm space-y-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <img
            src="/logo.png"
            alt=""
            className="h-16 w-auto"
            width={63}
            height={64}
          />
          <h1 className="text-2xl font-semibold tracking-tight text-teal-800">
            Où Déjeuner
          </h1>
          <p className="text-sm text-teal-700/80">
            Enter the office password to continue.
          </p>
        </div>

        <StorageProbe />

        <form
          action={unlockGate}
          className="space-y-3 rounded-2xl border border-copper-200/60 bg-white/80 p-5 shadow-sm"
        >
          <input type="hidden" name="next" value={next ?? "/"} />
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
            className="w-full rounded-lg bg-copper-500 px-3 py-2 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-copper-600 active:scale-[0.99]"
          >
            Unlock
          </button>
        </form>
      </div>
    </main>
  );
}
