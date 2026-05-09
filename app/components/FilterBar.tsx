"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Chip = { value: string; icon: string; label: string };

const SERVICE: Chip[] = [
  { value: "dine_in", icon: "🪑", label: "Eat-in" },
  { value: "takeaway", icon: "🥡", label: "Takeaway" },
];

const DIETARY: Chip[] = [
  { value: "vegetarian", icon: "🥬", label: "Vegetarian" },
  { value: "halal", icon: "☪️", label: "Halal" },
];

const OCCASION: Chip[] = [
  { value: "express", icon: "⏱️", label: "Express" },
  { value: "business", icon: "💼", label: "Business" },
  { value: "large_groups", icon: "👥", label: "Large groups" },
];

const GROUPS: { param: string; chips: Chip[] }[] = [
  { param: "service", chips: SERVICE },
  { param: "dietary", chips: DIETARY },
  { param: "occasion", chips: OCCASION },
];

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const toggle = (param: string, value: string) => {
    const current = new Set(
      (searchParams.get(param) ?? "").split(",").filter(Boolean),
    );
    if (current.has(value)) current.delete(value);
    else current.add(value);

    const params = new URLSearchParams(searchParams.toString());
    if (current.size === 0) params.delete(param);
    else params.set(param, Array.from(current).join(","));

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const isActive = (param: string, value: string) =>
    (searchParams.get(param) ?? "").split(",").includes(value);

  return (
    <div className="border-b border-copper-200/40 bg-cream-50/60">
      <div className="mx-auto max-w-6xl overflow-x-auto px-2 py-2">
        <div className="flex items-center gap-2 whitespace-nowrap">
          {GROUPS.flatMap((g) =>
            g.chips.map((c) => (
              <FilterChip
                key={`${g.param}-${c.value}`}
                icon={c.icon}
                label={c.label}
                active={isActive(g.param, c.value)}
                onClick={() => toggle(g.param, c.value)}
              />
            )),
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-copper-500 bg-copper-100 px-3 py-1 text-xs font-semibold text-copper-800 shadow-sm"
          : "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-teal-700/20 bg-white/70 px-3 py-1 text-xs font-medium text-teal-800 transition hover:border-teal-700/50 hover:bg-white"
      }
    >
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
