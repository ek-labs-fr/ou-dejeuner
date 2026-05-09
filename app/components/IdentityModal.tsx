"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  DISPLAY_NAME_MAX_LEN,
  getDisplayName,
  setDisplayName as persistDisplayName,
} from "@/lib/identity";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: (name: string) => void;
  // When true, the X / overlay click are hidden — the user must commit a name.
  // Phase 3 will pass `required` from write flows; Phase 2 leaves it false.
  required?: boolean;
};

export function IdentityModal({ open, onClose, onSaved, required }: Props) {
  const [mounted, setMounted] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setValue(getDisplayName() ?? "");
    // Defer focus until after the portal is in the DOM.
    queueMicrotask(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !required) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, required]);

  if (!open || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    persistDisplayName(trimmed);
    onSaved?.(trimmed);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-teal-900/30 p-4 backdrop-blur-sm"
      onClick={() => !required && onClose()}
      role="presentation"
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Set your display name"
        className="w-full max-w-sm space-y-4 rounded-2xl bg-cream-50 p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-teal-900">
            Enter your first name and the initial of your last name
          </h2>
          {!required && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 rounded-md p-1 text-xl leading-none text-teal-700/60 transition hover:bg-copper-50 hover:text-teal-900"
            >
              ×
            </button>
          )}
        </div>

        <p className="text-sm text-teal-700/80">
          Shown on your votes, tags, and comments.
        </p>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={DISPLAY_NAME_MAX_LEN}
          placeholder="e.g. Marine B"
          className="w-full rounded-lg border border-teal-700/20 bg-white px-3 py-2 text-base text-teal-900 outline-none transition focus:border-copper-500 focus:ring-2 focus:ring-copper-300/40"
        />

        <div className="flex items-center justify-end gap-2">
          {!required && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm font-medium text-teal-700/70 transition hover:bg-copper-50 hover:text-teal-900"
            >
              Skip
            </button>
          )}
          <button
            type="submit"
            disabled={!value.trim()}
            className="rounded-lg bg-copper-500 px-3 py-2 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-copper-600 disabled:cursor-not-allowed disabled:bg-copper-300"
          >
            Save
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
