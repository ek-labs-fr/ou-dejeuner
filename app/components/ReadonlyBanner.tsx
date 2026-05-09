export function ReadonlyBanner() {
  return (
    <div className="border-b border-copper-200/60 bg-copper-50/80 text-center text-xs font-medium text-copper-800">
      <div className="mx-auto max-w-6xl px-4 py-1.5">
        <span aria-hidden className="mr-1">👁️</span>
        Viewing in read-only mode — voting, tagging, and comments are
        unavailable.
      </div>
    </div>
  );
}
