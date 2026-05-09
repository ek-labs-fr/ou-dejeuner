"use client";

import { useEffect, useState } from "react";

// Detects whether the browser will let us use localStorage. The gate cookie
// itself is httpOnly so we can't probe cookies directly — but if localStorage
// is blocked, cookies are usually blocked too (same browser-level toggle in
// most cases), and the rest of the site needs localStorage anyway for the
// browser ID + display name. So this single probe is a good proxy.
export function StorageProbe() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    try {
      const k = "__od_probe__";
      window.localStorage.setItem(k, "1");
      window.localStorage.removeItem(k);
    } catch {
      setBlocked(true);
    }
  }, []);

  if (!blocked) return null;

  return (
    <div className="rounded-lg border border-copper-400 bg-copper-50 p-3 text-sm text-copper-800">
      <strong className="font-semibold">Storage is disabled.</strong> This site
      needs cookies and <code>localStorage</code> to remember your sign-in.
      Please enable both for this site and reload the page.
    </div>
  );
}
