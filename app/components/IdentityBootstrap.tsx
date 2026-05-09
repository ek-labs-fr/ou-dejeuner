"use client";

import { useEffect } from "react";

import { getOrCreateBrowserId } from "@/lib/identity";

// Sets the od_browser cookie on first mount if it isn't there yet, so the
// next server render sees it and can populate per-user state on cards.
export function IdentityBootstrap() {
  useEffect(() => {
    getOrCreateBrowserId();
  }, []);
  return null;
}
