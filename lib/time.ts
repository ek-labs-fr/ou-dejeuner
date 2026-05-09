// Tiny relative-time helper. Formal i18n shows up in Phase 6 with next-intl;
// until then we just use English month abbreviations for old timestamps.
export function relativeTime(d: Date): string {
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk} wk${wk === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}
