"use client";

import { useEffect, useRef, useState } from "react";

import {
  clearDisplayName,
  getBrowserId,
  getDisplayName,
  getOrCreateBrowserId,
} from "@/lib/identity";

import { IdentityModal } from "./IdentityModal";

export function ProfileMenu() {
  const [name, setName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [browserId, setBrowserIdState] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Hydrate from localStorage post-mount, generate the browser ID if missing.
  useEffect(() => {
    setName(getDisplayName());
    setBrowserIdState(getOrCreateBrowserId());
  }, []);

  // Close the dropdown on outside-click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-teal-700/30 bg-white/70 px-3 py-1 text-xs font-medium text-teal-800 transition hover:border-teal-700 hover:bg-white"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span aria-hidden>👤</span>
        <span className="max-w-[8rem] truncate">
          {name ?? "Set your name"}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-64 rounded-xl border border-copper-200/60 bg-cream-50 p-3 text-sm shadow-lg"
        >
          <div className="mb-2 text-xs uppercase tracking-wide text-copper-600">
            Your profile
          </div>
          <div className="mb-3 space-y-1">
            <div className="text-teal-900">
              <span className="text-xs text-teal-700/60">Display name</span>
              <div className="font-medium">{name ?? "(none yet)"}</div>
            </div>
            <div className="text-teal-900">
              <span className="text-xs text-teal-700/60">Browser ID</span>
              <div className="truncate font-mono text-xs text-teal-700/80">
                {browserId.slice(0, 8) || "—"}…
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setOpen(false);
              }}
              className="rounded-md px-2 py-1.5 text-left text-teal-900 transition hover:bg-copper-50"
            >
              {name ? "Edit display name" : "Set display name"}
            </button>
            {name && (
              <button
                type="button"
                onClick={() => {
                  clearDisplayName();
                  setName(null);
                  setOpen(false);
                }}
                className="rounded-md px-2 py-1.5 text-left text-teal-700/80 transition hover:bg-copper-50"
              >
                Clear display name
              </button>
            )}
          </div>
        </div>
      )}

      <IdentityModal
        open={editing}
        onClose={() => setEditing(false)}
        onSaved={setName}
      />
    </div>
  );
}
