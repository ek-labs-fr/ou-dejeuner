"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { priceLevelToSymbol, type Restaurant } from "@/lib/restaurant-types";

export function PickForMe({ places }: { places: Restaurant[] }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Restaurant | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const empty = places.length === 0;

  // Bias toward popular places: random pick from the top 100 by weighted
  // score (loves × 2 + likes), walking-time tiebreaker. Falls back to the
  // closest 100 when no votes exist yet.
  const POPULAR_POOL_SIZE = 100;

  const roll = () => {
    if (empty) return;
    const pool = places
      .slice()
      .sort(
        (a, b) =>
          (b.loveCount * 2 + b.likeCount) - (a.loveCount * 2 + a.likeCount) ||
          a.walkMin - b.walkMin,
      )
      .slice(0, POPULAR_POOL_SIZE);
    const next = pool[Math.floor(Math.random() * pool.length)];
    setPicked(next ?? null);
    setOpen(true);
  };

  const overlay = open && mounted && picked
    ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-teal-900/30 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Picked restaurant"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-2xl bg-cream-50 p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider text-copper-600">
                  Today’s pick
                </div>
                <h2
                  title={picked.name}
                  className="mt-1 truncate text-xl font-semibold text-teal-900"
                >
                  {picked.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-1 rounded-md p-1 text-xl leading-none text-teal-700/60 transition hover:bg-copper-50 hover:text-teal-900"
              >
                ×
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-teal-800/90">
              <span className="inline-flex items-center gap-1 tabular-nums">
                <span aria-hidden>🚶</span>
                <span>{picked.walkMin} min</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>🧭</span>
                <span>{picked.direction}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>🍽️</span>
                <span>{picked.primaryTypeLabel}</span>
              </span>
              {picked.priceLevel && (
                <span className="text-sm font-medium text-copper-600">
                  {priceLevelToSymbol(picked.priceLevel)}
                </span>
              )}
            </div>

            {picked.address && (
              <p className="text-xs text-teal-700/70">{picked.address}</p>
            )}

            <div className="flex flex-wrap gap-1.5">
              <CountChip icon="❤️" count={picked.loveCount} />
              <CountChip icon="👍" count={picked.likeCount} />
              {picked.dineInCount > 0 && <CountChip icon="🪑" count={picked.dineInCount} />}
              {picked.takeawayCount > 0 && <CountChip icon="🥡" count={picked.takeawayCount} />}
              {picked.vegCount > 0 && <CountChip icon="🥬" count={picked.vegCount} />}
              {picked.halalCount > 0 && <CountChip icon="☪️" count={picked.halalCount} />}
              {picked.expressCount > 0 && <CountChip icon="⏱️" count={picked.expressCount} />}
              {picked.businessCount > 0 && <CountChip icon="💼" count={picked.businessCount} />}
              {picked.largeGroupCount > 0 && <CountChip icon="👥" count={picked.largeGroupCount} />}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-copper-100 pt-3">
              <button
                type="button"
                onClick={roll}
                className="inline-flex items-center gap-1.5 rounded-full border border-copper-500 bg-copper-50 px-3 py-1.5 text-sm font-semibold text-copper-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-copper-100"
              >
                <span aria-hidden>🎲</span>
                <span>Pick again</span>
              </button>
              {picked.googleMapsUri && (
                <a
                  href={picked.googleMapsUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-copper-600 hover:text-copper-700 hover:underline"
                >
                  Open in Maps →
                </a>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        type="button"
        onClick={roll}
        disabled={empty}
        title={empty ? "Loosen your filters first" : "Pick a random restaurant"}
        className="inline-flex items-center gap-1.5 rounded-full border border-copper-500 bg-copper-50 px-3 py-1.5 text-sm font-semibold text-copper-700 shadow-sm transition hover:bg-copper-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden>🎲</span>
        <span className="hidden sm:inline">Pick for me</span>
      </button>
      {overlay}
    </>
  );
}

function CountChip({ icon, count }: { icon: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-teal-700/30 bg-white px-2.5 py-1 text-xs font-medium text-teal-800">
      <span aria-hidden>{icon}</span>
      <span className="tabular-nums">{count}</span>
    </span>
  );
}
