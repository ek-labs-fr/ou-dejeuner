"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useIdentity } from "./IdentityProvider";

type Mode = "url" | "manual";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
};

export function SubmitRestaurantModal({ open, onClose, onSubmitted }: Props) {
  const [mode, setMode] = useState<Mode>("url");
  const [sourceUrl, setSourceUrl] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const { ensureDisplayName } = useIdentity();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSubmitted(false);
    queueMicrotask(() => firstFieldRef.current?.focus());
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy && !submitted) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, submitted, onClose]);

  if (!open) return null;

  const reset = () => {
    setSourceUrl("");
    setNameInput("");
    setAddressInput("");
    setMode("url");
    setError(null);
    setSubmitted(false);
  };

  const onSubmit = async () => {
    setError(null);

    const trimmedUrl = sourceUrl.trim();
    const trimmedName = nameInput.trim();
    const trimmedAddress = addressInput.trim();

    if (mode === "url") {
      if (!trimmedUrl) {
        setError("Paste a Google Maps URL.");
        return;
      }
      if (!/^https?:\/\//i.test(trimmedUrl)) {
        setError("That doesn’t look like a URL.");
        return;
      }
    } else {
      if (!trimmedName || !trimmedAddress) {
        setError("Both name and address are required.");
        return;
      }
    }

    const displayName = await ensureDisplayName();
    if (!displayName) return;

    setBusy(true);
    try {
      const body =
        mode === "url"
          ? { sourceUrl: trimmedUrl, displayName }
          : { nameInput: trimmedName, addressInput: trimmedAddress, displayName };
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      setSubmitted(true);
      onSubmitted?.();
      router.refresh();
      setTimeout(() => {
        onClose();
        reset();
      }, 1300);
    } catch (err) {
      console.error("submission failed", err);
      setError("Couldn’t send the submission. Try again?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-teal-900/30 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={() => !busy && !submitted && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Submit a restaurant"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-2xl bg-cream-50 p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-teal-900">
              Submit a restaurant
            </h2>
            <p className="mt-1 text-sm text-teal-700/80">
              The admin will review and add it to the catalogue.
            </p>
          </div>
          {!busy && !submitted && (
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

        {!submitted ? (
          <>
            <div className="flex gap-1 rounded-lg border border-teal-700/15 bg-white p-1 text-xs font-medium">
              <ModeTab
                active={mode === "url"}
                onClick={() => setMode("url")}
                label="Google Maps URL"
              />
              <ModeTab
                active={mode === "manual"}
                onClick={() => setMode("manual")}
                label="Name + address"
              />
            </div>

            {mode === "url" ? (
              <label className="block text-xs font-semibold uppercase tracking-wide text-copper-600">
                Google Maps URL
                <textarea
                  ref={firstFieldRef as React.RefObject<HTMLTextAreaElement>}
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  rows={3}
                  maxLength={2048}
                  placeholder="https://maps.app.goo.gl/… or https://www.google.com/maps/place/…"
                  className="mt-1 w-full rounded-lg border border-teal-700/20 bg-white px-3 py-2 text-sm text-teal-900 outline-none transition focus:border-copper-500 focus:ring-2 focus:ring-copper-300/40"
                />
                <span className="mt-1 block text-[11px] font-normal normal-case text-teal-700/60">
                  Open the place in Google Maps, tap Share, copy the link.
                </span>
              </label>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wide text-copper-600">
                  Restaurant name
                  <input
                    ref={firstFieldRef as React.RefObject<HTMLInputElement>}
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={200}
                    placeholder="e.g. Chez Marguerite"
                    className="mt-1 w-full rounded-lg border border-teal-700/20 bg-white px-3 py-2 text-sm text-teal-900 outline-none transition focus:border-copper-500 focus:ring-2 focus:ring-copper-300/40"
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-copper-600">
                  Address
                  <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    maxLength={300}
                    placeholder="e.g. 12 rue Saint-Lazare, 75009 Paris"
                    className="mt-1 w-full rounded-lg border border-teal-700/20 bg-white px-3 py-2 text-sm text-teal-900 outline-none transition focus:border-copper-500 focus:ring-2 focus:ring-copper-300/40"
                  />
                </label>
              </div>
            )}

            {error && (
              <p className="text-sm text-copper-700" role="alert">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-lg px-3 py-2 text-sm font-medium text-teal-700/70 transition hover:bg-copper-50 hover:text-teal-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={busy}
                className="rounded-lg bg-copper-500 px-3 py-2 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-copper-600 disabled:bg-copper-300"
              >
                {busy ? "Sending…" : "Submit"}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-teal-700">
            Thanks — the admin will review your submission.
          </p>
        )}
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-1.5 transition ${
        active
          ? "bg-copper-100 text-copper-800 shadow-sm"
          : "text-teal-700/70 hover:bg-copper-50 hover:text-teal-900"
      }`}
    >
      {label}
    </button>
  );
}
