"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      const v = value.trim();
      if (v) next.set("q", v);
      else next.delete("q");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // Local input is the source of truth; intentionally not re-running on
    // searchParams to avoid clobbering live typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, pathname, router]);

  return (
    <div className="border-b border-copper-200/40 bg-cream-50/60">
      <div className="mx-auto max-w-6xl px-2 py-2">
        <div className="relative">
          <span
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-teal-700/60"
            aria-hidden
          >
            🔍
          </span>
          <input
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search by name, address, or cuisine"
            className="w-full rounded-full border border-teal-700/20 bg-white/80 py-2 pl-9 pr-9 text-sm text-teal-900 placeholder:text-teal-700/40 shadow-sm outline-none transition focus:border-copper-500 focus:bg-white focus:ring-2 focus:ring-copper-300/40"
            aria-label="Search restaurants"
          />
          {value && (
            <button
              type="button"
              onClick={() => setValue("")}
              className="absolute inset-y-0 right-2 flex items-center px-2 text-teal-700/50 hover:text-teal-800"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
