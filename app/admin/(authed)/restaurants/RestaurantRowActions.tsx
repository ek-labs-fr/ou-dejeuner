"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { OverrideState } from "@/src/db/schema";

type Props = {
  placeId: string;
  name?: string;
  isHidden: boolean;
  newBadgeOverride: OverrideState;
  overrideDineIn: OverrideState;
  overrideTakeaway: OverrideState;
  overrideVegetarian: OverrideState;
  overrideHalal: OverrideState;
};

const OVERRIDE_OPTIONS: OverrideState[] = ["auto", "on", "off"];
const TAG_LABELS: { key: keyof Pick<Props, "overrideDineIn" | "overrideTakeaway" | "overrideVegetarian" | "overrideHalal">; attr: string; label: string }[] = [
  { key: "overrideDineIn", attr: "dine_in", label: "Eat-in" },
  { key: "overrideTakeaway", attr: "takeaway", label: "Takeaway" },
  { key: "overrideVegetarian", attr: "vegetarian", label: "Vegetarian" },
  { key: "overrideHalal", attr: "halal", label: "Halal" },
];

export function RestaurantRowActions(props: Props) {
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const send = async (body: Record<string, unknown>) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/restaurants/${encodeURIComponent(props.placeId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      startTransition(() => router.refresh());
    } catch (err) {
      console.error("override failed", err);
      setError("Failed");
    }
  };

  const onDelete = async () => {
    if (
      !confirm(
        `Hard-delete "${props.name ?? props.placeId}"? Cascades to all reactions, tags, comments, and issue reports for this restaurant. No recovery.`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/admin/restaurants/${encodeURIComponent(props.placeId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      startTransition(() => router.refresh());
    } catch (err) {
      console.error("delete failed", err);
      setError("Delete failed");
    }
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => send({ isHidden: !props.isHidden })}
          disabled={busy}
          className={`rounded-md border px-2 py-1 font-semibold transition ${
            props.isHidden
              ? "border-teal-700/40 text-teal-700 hover:bg-teal-50"
              : "border-copper-400 text-copper-700 hover:bg-copper-50"
          } disabled:opacity-60`}
        >
          {props.isHidden ? "Unhide" : "Hide"}
        </button>
        <Selector
          label="🌱 New"
          value={props.newBadgeOverride}
          onChange={(v) => send({ newBadgeOverride: v })}
          disabled={busy}
        />
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          title="Hard-delete (cascades)"
          className="ml-auto rounded-md border border-copper-600 bg-copper-50/50 px-2 py-1 font-semibold text-copper-800 transition hover:bg-copper-100 disabled:opacity-60"
        >
          Delete
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {TAG_LABELS.map((t) => (
          <Selector
            key={t.key}
            label={t.label}
            value={props[t.key]}
            onChange={(v) =>
              send({ tagOverride: { attribute: t.attr, value: v } })
            }
            disabled={busy}
          />
        ))}
      </div>
      {error && <div className="text-copper-700">{error}</div>}
    </div>
  );
}

function Selector({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: OverrideState;
  onChange: (v: OverrideState) => void;
  disabled?: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-1 rounded-md border border-teal-700/15 bg-white px-1.5 py-0.5">
      <span className="text-teal-700/70">{label}:</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as OverrideState)}
        className="bg-transparent text-teal-900 outline-none"
      >
        {OVERRIDE_OPTIONS.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
