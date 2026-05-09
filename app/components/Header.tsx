import { Legend } from "@/app/components/Legend";
import { ProfileMenu } from "@/app/components/ProfileMenu";
import type { Tier } from "@/lib/gate";

export function Header({ tier }: { tier: Tier }) {
  return (
    <header className="border-b border-copper-200/40 bg-cream-50/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3">
        <a href="/" className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Où Déjeuner"
            className="h-14 w-auto"
            width={55}
            height={56}
          />
          <span className="flex flex-col leading-none">
            <span className="translate-y-0.5 text-lg font-semibold leading-none tracking-tight text-teal-800 sm:text-2xl">
              Où Déjeuner
            </span>
            <span className="hidden -translate-y-0.5 text-sm text-copper-600 sm:inline">
              oudejeuner.com
            </span>
          </span>
        </a>

        <div className="flex items-center gap-2">
          <Legend />
          {tier === "full" && <ProfileMenu />}
        </div>
      </div>
    </header>
  );
}
