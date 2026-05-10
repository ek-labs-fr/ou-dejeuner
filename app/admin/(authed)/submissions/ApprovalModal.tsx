"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { RESTAURANT_TYPE_OPTIONS } from "@/lib/places-labels";

const PRICE_OPTIONS: { value: string; label: string }[] = [
  { value: "PRICE_LEVEL_INEXPENSIVE", label: "€" },
  { value: "PRICE_LEVEL_MODERATE", label: "€€" },
  { value: "PRICE_LEVEL_EXPENSIVE", label: "€€€" },
  { value: "PRICE_LEVEL_VERY_EXPENSIVE", label: "€€€€" },
];

export type SubmissionForApproval = {
  id: number;
  sourceUrl: string | null;
  nameInput: string | null;
  addressInput: string | null;
};

type Props = {
  submission: SubmissionForApproval | null;
  onClose: () => void;
};

// Pulls "@48.8746,2.3304" out of a Google Maps URL — first match wins.
function extractLatLng(url: string): { lat: number; lng: number } | null {
  const m = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function ApprovalModal({ submission, onClose }: Props) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [googleMapsUri, setGoogleMapsUri] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [primaryType, setPrimaryType] = useState("");
  const [priceLevel, setPriceLevel] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Reset form when a different submission opens.
  useEffect(() => {
    if (!submission) return;
    setError(null);
    setName(submission.nameInput ?? "");
    setAddress(submission.addressInput ?? "");
    setGoogleMapsUri(submission.sourceUrl ?? "");
    setPrimaryType("");
    setPriceLevel("");
    setPlaceId("");
    // Try auto-extracting lat/lng from the URL up front.
    const ll = submission.sourceUrl ? extractLatLng(submission.sourceUrl) : null;
    setLatitude(ll ? String(ll.lat) : "");
    setLongitude(ll ? String(ll.lng) : "");
    queueMicrotask(() => firstRef.current?.focus());
  }, [submission]);

  useEffect(() => {
    if (!submission) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [submission, busy, onClose]);

  if (!submission) return null;

  const onUrlChange = (v: string) => {
    setGoogleMapsUri(v);
    // Re-fill lat/lng from the URL only if the admin hasn't typed their own.
    if (!latitude && !longitude) {
      const ll = extractLatLng(v);
      if (ll) {
        setLatitude(String(ll.lat));
        setLongitude(String(ll.lng));
      }
    }
  };

  const onSubmit = async () => {
    setError(null);
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!name.trim()) return setError("Name is required.");
    if (!address.trim()) return setError("Address is required.");
    if (!googleMapsUri.trim()) return setError("Google Maps URL is required.");
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return setError("Latitude must be a number between -90 and 90.");
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) return setError("Longitude must be a number between -180 and 180.");

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/submissions/${submission.id}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          googleMapsUri: googleMapsUri.trim(),
          latitude: lat,
          longitude: lng,
          primaryType: primaryType || undefined,
          priceLevel: priceLevel || undefined,
          placeId: placeId.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(`Approve failed: ${data.error ?? res.status}`);
        return;
      }
      router.refresh();
      onClose();
    } catch (err) {
      console.error("approve failed", err);
      setError("Approve failed — see console.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-teal-900/30 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Approve submission"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl bg-cream-50 p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-teal-900">
              Approve submission #{submission.id}
            </h2>
            <p className="mt-1 text-sm text-teal-700/80">
              Fill in the restaurant data manually — no Google API call.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="-mr-1 rounded-md p-1 text-xl leading-none text-teal-700/60 transition hover:bg-copper-50 hover:text-teal-900 disabled:opacity-60"
          >
            ×
          </button>
        </div>

        <Field label="Name" required>
          <input
            ref={firstRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            className={inputCls}
          />
        </Field>

        <Field label="Address" required>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={300}
            className={inputCls}
          />
        </Field>

        <Field label="Google Maps URL" required hint="Paste from Maps → Share. We auto-extract lat/lng from the URL when possible.">
          <textarea
            value={googleMapsUri}
            onChange={(e) => onUrlChange(e.target.value)}
            rows={2}
            maxLength={2048}
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude" required>
            <input
              type="text"
              inputMode="decimal"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="48.8746"
              className={inputCls}
            />
          </Field>
          <Field label="Longitude" required>
            <input
              type="text"
              inputMode="decimal"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="2.3304"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Cuisine / type">
            <select
              value={primaryType}
              onChange={(e) => setPrimaryType(e.target.value)}
              className={inputCls}
            >
              <option value="">(none)</option>
              {RESTAURANT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.icon ? `${o.icon} ` : ""}{o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Price level">
            <select
              value={priceLevel}
              onChange={(e) => setPriceLevel(e.target.value)}
              className={inputCls}
            >
              <option value="">(none)</option>
              {PRICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          label="Place ID (optional)"
          hint="Find at developers.google.com/maps/documentation/places/web-service/place-id — paste a ChIJ… ID and we'll merge if it already exists. Leave blank to generate a synthetic one."
        >
          <input
            type="text"
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
            placeholder="ChIJ…"
            maxLength={256}
            className={`${inputCls} font-mono`}
          />
        </Field>

        {error && (
          <p className="text-sm text-copper-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-copper-200/40 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-teal-700/80 transition hover:bg-copper-50 hover:text-teal-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-teal-800 disabled:opacity-60"
          >
            {busy ? "Approving…" : "Approve & create"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-teal-700/20 bg-white px-2 py-1.5 text-sm text-teal-900 outline-none transition focus:border-copper-500 focus:ring-2 focus:ring-copper-300/40";

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-copper-600">
        {label}
        {required && <span aria-hidden className="ml-0.5 text-copper-700">*</span>}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-[11px] text-teal-700/60">{hint}</span>
      )}
    </label>
  );
}
