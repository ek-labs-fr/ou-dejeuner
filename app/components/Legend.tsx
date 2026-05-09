"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Entry = { icon: string; label: string; hint?: string };

const SECTIONS: { title: string; entries: Entry[] }[] = [
  {
    title: "Card info",
    entries: [
      { icon: "🚶", label: "Walking time", hint: "from the office" },
      { icon: "€", label: "Price level", hint: "€ to €€€€" },
      { icon: "🌱", label: "New", hint: "added in the last 3 months" },
    ],
  },
  {
    title: "Tags · tap to mark",
    entries: [
      { icon: "🪑", label: "Eat-in" },
      { icon: "🥡", label: "Takeaway" },
      { icon: "🥬", label: "Vegetarian" },
      { icon: "☪️", label: "Halal" },
      { icon: "⏱️", label: "Express", hint: "Quick eat-in or takeaway" },
      { icon: "💼", label: "Business lunch" },
      { icon: "👥", label: "Large groups" },
    ],
  },
  {
    title: "Reactions · pick one",
    entries: [
      { icon: "❤️", label: "Love" },
      { icon: "👍", label: "Like" },
    ],
  },
  {
    title: "Other",
    entries: [
      { icon: "⚠️", label: "Report an issue" },
      { icon: "🎲", label: "Pick one for me", hint: "random restaurant" },
    ],
  },
];

export function Legend() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // document.body only exists on the client; defer the portal until after mount.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape and lock body scroll while open.
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

  const overlay = open && mounted
    ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-teal-900/30 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Icon legend"
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-cream-50 p-5 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-teal-900">
                What the icons mean
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-1 rounded-md p-1 text-xl leading-none text-teal-700/60 transition hover:bg-copper-50 hover:text-teal-900"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {SECTIONS.map((section) => (
                <section key={section.title}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-copper-600">
                    {section.title}
                  </h3>
                  <ul className="space-y-1.5">
                    {section.entries.map((e) => (
                      <li
                        key={e.label}
                        className="flex items-baseline gap-3 text-sm text-teal-900"
                      >
                        <span
                          aria-hidden
                          className="w-6 shrink-0 text-base leading-none"
                        >
                          {e.icon}
                        </span>
                        <span className="font-medium">{e.label}</span>
                        {e.hint && (
                          <span className="text-xs text-teal-700/60">
                            — {e.hint}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
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
        onClick={() => setOpen(true)}
        aria-label="What the icons mean"
        title="What the icons mean"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-teal-700/30 bg-white/70 text-sm font-semibold text-teal-800 transition hover:border-teal-700 hover:bg-white"
      >
        ?
      </button>
      {overlay}
    </>
  );
}
