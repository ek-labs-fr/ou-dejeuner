import {
  InteractiveTagChip,
  Reactions,
  ReportIssueButton,
} from "@/app/components/CardWriteActions";
import { CommentsButton } from "@/app/components/Comments";
import type { Tier } from "@/lib/gate";
import { priceLevelToSymbol, type Restaurant } from "@/lib/restaurants";

const TAGS_ROW_1 = [
  { attribute: "dine_in", icon: "🪑", label: "Eat-in", countKey: "dineInCount" as const },
  { attribute: "takeaway", icon: "🥡", label: "Takeaway", countKey: "takeawayCount" as const },
  { attribute: "vegetarian", icon: "🥬", label: "Vegetarian", countKey: "vegCount" as const },
  { attribute: "halal", icon: "☪️", label: "Halal", countKey: "halalCount" as const },
] as const;

const TAGS_ROW_2 = [
  { attribute: "express", icon: "⏱️", label: "Express", countKey: "expressCount" as const },
  { attribute: "business", icon: "💼", label: "Business", countKey: "businessCount" as const },
  { attribute: "large_groups", icon: "👥", label: "Large groups", countKey: "largeGroupCount" as const },
] as const;

export function RestaurantCard({ r, tier }: { r: Restaurant; tier: Tier }) {
  const price = priceLevelToSymbol(r.priceLevel);
  const interactive = tier === "full";

  return (
    <li className="group flex flex-col rounded-xl border border-copper-200/60 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-copper-300 hover:shadow-md">
      {/* Top row: name + price + report */}
      <div className="flex items-start justify-between gap-2">
        <h2
          title={r.name}
          className="min-w-0 flex-1 truncate text-base font-semibold leading-snug text-teal-900"
        >
          {r.name}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          {price && (
            <span className="text-sm font-medium text-copper-600">
              {price}
            </span>
          )}
          {interactive && (
            <ReportIssueButton placeId={r.id} placeName={r.name} />
          )}
        </div>
      </div>

      {/* Metadata row: walking time + cuisine */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-teal-800/90">
        <span className="inline-flex items-center gap-1 tabular-nums">
          <span aria-hidden>🚶</span>
          <span>{r.walkMin} min</span>
        </span>
        <span
          className="inline-flex items-center gap-1"
          title={`${r.direction} of the office`}
        >
          <span aria-hidden>🧭</span>
          <span>{r.direction}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span aria-hidden>🍽️</span>
          <span>{r.primaryTypeLabel}</span>
        </span>
      </div>

      {r.address && (
        <p className="mt-1.5 line-clamp-1 text-xs text-teal-700/60">
          {r.address}
        </p>
      )}

      {/* Community tags. Row 1 = availability + dietary; row 2 = occasion.
          Both rows use a 4-col grid so chips line up across the two rows. */}
      <div className="mt-3 space-y-1.5">
        <div className="grid grid-cols-4 gap-1.5">
          {TAGS_ROW_1.map((t) =>
            interactive ? (
              <InteractiveTagChip
                key={t.attribute}
                placeId={r.id}
                attribute={t.attribute}
                icon={t.icon}
                label={t.label}
                initialActive={r.my.tags[t.attribute]}
                initialCount={r[t.countKey]}
              />
            ) : (
              <StaticTagChip
                key={t.attribute}
                icon={t.icon}
                label={t.label}
                count={r[t.countKey]}
              />
            ),
          )}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {TAGS_ROW_2.map((t) =>
            interactive ? (
              <InteractiveTagChip
                key={t.attribute}
                placeId={r.id}
                attribute={t.attribute}
                icon={t.icon}
                label={t.label}
                initialActive={r.my.tags[t.attribute]}
                initialCount={r[t.countKey]}
              />
            ) : (
              <StaticTagChip
                key={t.attribute}
                icon={t.icon}
                label={t.label}
                count={r[t.countKey]}
              />
            ),
          )}
        </div>
      </div>

      {/* Reactions + maps link */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-copper-100 pt-3">
        <div className="flex items-center gap-1.5">
          {interactive ? (
            <Reactions
              placeId={r.id}
              initialReaction={r.my.reaction}
              initialLoveCount={r.loveCount}
              initialLikeCount={r.likeCount}
            />
          ) : (
            <>
              <StaticReactionPill icon="❤️" label="Love" count={r.loveCount} />
              <StaticReactionPill icon="👍" label="Like" count={r.likeCount} />
            </>
          )}
          {/* Comments are full-tier only — read-only viewers don't see threads. */}
          {interactive && (
            <CommentsButton
              placeId={r.id}
              placeName={r.name}
              initialCount={r.commentCount}
            />
          )}
        </div>
        {r.googleMapsUri && (
          <a
            href={r.googleMapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-copper-600 hover:text-copper-700 hover:underline"
          >
            Maps →
          </a>
        )}
      </div>
    </li>
  );
}

function StaticTagChip({
  icon,
  label,
  count,
}: {
  icon: string;
  label: string;
  count: number;
}) {
  return (
    <span
      aria-label={label}
      title={label}
      className="flex h-8 w-full items-center justify-center gap-1 rounded-full border border-teal-700/40 bg-teal-50 px-2.5 text-sm font-medium text-teal-800"
    >
      <span aria-hidden className="text-base leading-none">{icon}</span>
      <span className="tabular-nums">
        {count > 0 ? count : <span className="text-xs opacity-60">—</span>}
      </span>
    </span>
  );
}

function StaticReactionPill({
  icon,
  label,
  count,
  populated,
}: {
  icon: string;
  label: string;
  count: number;
  populated?: boolean;
}) {
  const hasCount = populated ?? count > 0;
  return (
    <span
      aria-label={label}
      title={label}
      className={
        hasCount
          ? "inline-flex items-center gap-1.5 rounded-full border border-copper-300 bg-copper-50 px-3 py-1 text-sm font-medium text-copper-700 shadow-sm"
          : "inline-flex items-center gap-1.5 rounded-full border border-teal-700/15 bg-transparent px-3 py-1 text-sm text-teal-700/35"
      }
    >
      <span
        aria-hidden
        className={hasCount ? "text-base leading-none" : "text-base leading-none opacity-50"}
      >
        {icon}
      </span>
      {hasCount && (
        <span className="tabular-nums text-xs">{count}</span>
      )}
    </span>
  );
}
