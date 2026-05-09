"use client";

export function TopButton() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      title="Back to top"
      aria-label="Back to top"
      className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-cream-50 shadow-lg transition hover:bg-teal-800 active:scale-95"
    >
      <span aria-hidden>↑</span>
      <span>Top</span>
    </button>
  );
}
