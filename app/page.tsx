import { Header } from "@/app/components/Header";
import { FilterBar } from "@/app/components/FilterBar";
import { PickForMe } from "@/app/components/PickForMe";
import { SearchBar } from "@/app/components/SearchBar";
import { RestaurantCard } from "@/app/components/RestaurantCard";
import { SortMenu } from "@/app/components/SortMenu";
import { TopButton } from "@/app/components/TopButton";
import { applyFilters, hasAnyFilter, parseFilters } from "@/lib/filters";
import { getTier } from "@/lib/gate-server";
import { getBrowserIdFromCookie } from "@/lib/identity-server";
import { getRestaurants, type Restaurant } from "@/lib/restaurants";
import { isSortKey, SORT_LABELS, sortRestaurants, type SortKey } from "@/lib/sort";

const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const matches = (r: Restaurant, q: string) =>
  norm(r.name).includes(q) ||
  norm(r.address).includes(q) ||
  norm(r.primaryTypeLabel).includes(q);

type SearchParams = {
  q?: string;
  sort?: string;
  dietary?: string;
  service?: string;
  occasion?: string;
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [params, tier, browserId] = await Promise.all([
    searchParams,
    getTier(),
    getBrowserIdFromCookie(),
  ]);
  const safeTier = tier ?? "readonly";
  const sortKey: SortKey = isSortKey(params.sort) ? params.sort : "weighted";
  const filters = parseFilters(params);

  // Read-only viewers can't write, so my-state is moot for them. Skip the
  // per-user query to keep page loads cheap.
  const all = getRestaurants(safeTier === "full" ? browserId : null);
  const query = norm((params.q ?? "").trim());
  const hasQuery = query.length > 0;
  const hasFilters = hasAnyFilter(filters);

  let candidates = all;
  if (hasQuery) candidates = candidates.filter((r) => matches(r, query));
  if (hasFilters) candidates = applyFilters(candidates, filters);

  const visible = sortRestaurants(candidates, sortKey);

  let notice: string;
  if (hasQuery || hasFilters) {
    const subject = hasQuery
      ? `for “${params.q}”`
      : "matching your filters";
    notice =
      visible.length === 0
        ? `No matches ${subject}`
        : `${visible.length} ${visible.length === 1 ? "match" : "matches"} ${subject}`;
  } else {
    notice = `${visible.length} restaurants`;
  }
  notice += ` · sorted by ${SORT_LABELS[sortKey]}`;

  return (
    <>
      <Header tier={safeTier} />
      <SearchBar />
      <FilterBar />
      <main className="mx-auto max-w-6xl px-2 py-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs uppercase tracking-wider text-teal-700/70">
            {notice}
          </div>
          <div className="flex items-center gap-2">
            <SortMenu current={sortKey} />
            <PickForMe places={visible} />
          </div>
        </div>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((r) => (
            <RestaurantCard key={r.id} r={r} tier={safeTier} />
          ))}
        </ul>
      </main>
      <TopButton />
    </>
  );
}
