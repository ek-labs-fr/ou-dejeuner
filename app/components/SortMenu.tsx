"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SORT_KEYS, SORT_LABELS, type SortKey } from "@/lib/sort";

export function SortMenu({ current }: { current: SortKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onChange = (next: SortKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "weighted") params.delete("sort");
    else params.set("sort", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <label className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-teal-700/70">
      <span>Sort</span>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="rounded-full border border-teal-700/30 bg-white/80 px-3 py-1 text-xs font-medium normal-case tracking-normal text-teal-800 outline-none transition focus:border-copper-500 focus:ring-2 focus:ring-copper-300/40"
      >
        {SORT_KEYS.map((k) => (
          <option key={k} value={k}>
            {SORT_LABELS[k]}
          </option>
        ))}
      </select>
    </label>
  );
}
