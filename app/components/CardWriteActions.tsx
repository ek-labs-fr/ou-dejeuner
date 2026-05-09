"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { TagAttribute } from "@/src/db/schema";

import { useIdentity } from "./IdentityProvider";

type ReactionKind = "love" | "like";

export function Reactions({
  placeId,
  initialReaction,
  initialLoveCount,
  initialLikeCount,
}: {
  placeId: string;
  initialReaction: ReactionKind | null;
  initialLoveCount: number;
  initialLikeCount: number;
}) {
  const [reaction, setReaction] = useState<ReactionKind | null>(initialReaction);
  const [loveCount, setLoveCount] = useState(initialLoveCount);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [busy, setBusy] = useState(false);
  const { ensureDisplayName } = useIdentity();
  const router = useRouter();

  const onClick = async (kind: ReactionKind) => {
    if (busy) return;
    const displayName = await ensureDisplayName();
    if (!displayName) return;

    const prev = { reaction, loveCount, likeCount };

    // Optimistic toggle/switch/set.
    let next: ReactionKind | null;
    let nextLove = loveCount;
    let nextLike = likeCount;
    if (reaction === kind) {
      next = null;
      if (kind === "love") nextLove--;
      else nextLike--;
    } else if (reaction) {
      next = kind;
      if (reaction === "love") nextLove--;
      else nextLike--;
      if (kind === "love") nextLove++;
      else nextLike++;
    } else {
      next = kind;
      if (kind === "love") nextLove++;
      else nextLike++;
    }
    setReaction(next);
    setLoveCount(nextLove);
    setLikeCount(nextLike);
    setBusy(true);

    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ placeId, kind, displayName }),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const data = (await res.json()) as { state: ReactionKind | null };
      setReaction(data.state);
      // Refresh aggregate counts in case other browsers acted concurrently.
      router.refresh();
    } catch (err) {
      setReaction(prev.reaction);
      setLoveCount(prev.loveCount);
      setLikeCount(prev.likeCount);
      console.error("reaction failed", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <ReactionPill
        icon="❤️"
        label="Love"
        count={loveCount}
        active={reaction === "love"}
        busy={busy}
        onClick={() => onClick("love")}
      />
      <ReactionPill
        icon="👍"
        label="Like"
        count={likeCount}
        active={reaction === "like"}
        busy={busy}
        onClick={() => onClick("like")}
      />
    </div>
  );
}

function ReactionPill({
  icon,
  label,
  count,
  active,
  busy,
  onClick,
}: {
  icon: string;
  label: string;
  count: number;
  active: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  const populated = count > 0;
  const base = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition active:scale-95";
  const visual = active
    ? "border border-copper-600 bg-copper-200 text-copper-900 shadow-sm"
    : populated
    ? "border border-copper-300 bg-copper-50 text-copper-700 shadow-sm hover:-translate-y-0.5 hover:border-copper-500 hover:bg-copper-100"
    : "border border-teal-700/15 bg-transparent text-teal-700/35 hover:-translate-y-0.5 hover:border-copper-400 hover:bg-copper-50/60 hover:text-copper-700";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`${base} ${visual} ${busy ? "opacity-60" : ""}`}
    >
      <span aria-hidden className={populated || active ? "text-base leading-none" : "text-base leading-none opacity-50"}>
        {icon}
      </span>
      {(populated || active) && (
        <span className="tabular-nums text-xs">{count}</span>
      )}
    </button>
  );
}

export function InteractiveTagChip({
  placeId,
  attribute,
  icon,
  label,
  initialActive,
  initialCount,
}: {
  placeId: string;
  attribute: TagAttribute;
  icon: string;
  label: string;
  initialActive: boolean;
  initialCount: number;
}) {
  const [active, setActive] = useState(initialActive);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const { ensureDisplayName } = useIdentity();
  const router = useRouter();

  const onClick = async () => {
    if (busy) return;
    const displayName = await ensureDisplayName();
    if (!displayName) return;

    const prev = { active, count };
    setActive(!active);
    setCount(active ? count - 1 : count + 1);
    setBusy(true);

    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ placeId, attribute, displayName }),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const data = (await res.json()) as { active: boolean };
      setActive(data.active);
      router.refresh();
    } catch (err) {
      setActive(prev.active);
      setCount(prev.count);
      console.error("tag failed", err);
    } finally {
      setBusy(false);
    }
  };

  const base = "flex h-8 w-full items-center justify-center gap-1 rounded-full px-2.5 text-sm font-medium transition";
  const visual = active
    ? "border border-teal-700 bg-teal-200 text-teal-900 shadow-sm"
    : "border border-teal-700/40 bg-teal-50 text-teal-800 hover:border-teal-700 hover:bg-teal-100";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`${base} ${visual} ${busy ? "opacity-60" : ""}`}
    >
      <span aria-hidden className="text-base leading-none">{icon}</span>
      <span className="tabular-nums">
        {count > 0 ? count : <span className="text-xs opacity-60">—</span>}
      </span>
    </button>
  );
}

type IssueType = "closed" | "not_lunch" | "incorrect_info" | "other";

const ISSUE_OPTIONS: { value: IssueType; label: string }[] = [
  { value: "closed", label: "The restaurant is closed" },
  { value: "not_lunch", label: "Not a lunch place" },
  { value: "incorrect_info", label: "Incorrect information" },
  { value: "other", label: "Other" },
];

export function ReportIssueButton({
  placeId,
  placeName,
}: {
  placeId: string;
  placeName: string;
}) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issueType, setIssueType] = useState<IssueType>("closed");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const firstRadioRef = useRef<HTMLInputElement>(null);
  const { ensureDisplayName } = useIdentity();

  useEffect(() => {
    if (open) queueMicrotask(() => firstRadioRef.current?.focus());
  }, [open]);

  const onSubmit = async () => {
    setError(null);
    const displayName = await ensureDisplayName();
    if (!displayName) return;
    setBusy(true);
    try {
      const res = await fetch("/api/closure-reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          placeId,
          displayName,
          issueType,
          note: note.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setIssueType("closed");
        setNote("");
      }, 1100);
    } catch (err) {
      console.error("issue report failed", err);
      setError("Couldn’t send the report. Try again?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Report an issue"
        aria-label="Report an issue"
        className="-mr-1 rounded-md p-1 text-base leading-none transition hover:bg-copper-50"
      >
        ⚠️
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-teal-900/30 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => !busy && !submitted && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Report an issue"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm space-y-4 rounded-2xl bg-cream-50 p-5 shadow-xl"
          >
            <div>
              <h2 className="text-lg font-semibold text-teal-900">
                Report an issue?
              </h2>
              <p className="mt-1 text-sm text-teal-700/80">
                <span className="font-medium">{placeName}</span> will be
                flagged for the admin to review.
              </p>
            </div>

            {!submitted ? (
              <>
                <fieldset className="space-y-1.5">
                  <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-copper-600">
                    What’s wrong?
                  </legend>
                  {ISSUE_OPTIONS.map((opt, idx) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-teal-900 transition hover:bg-copper-50"
                    >
                      <input
                        ref={idx === 0 ? firstRadioRef : undefined}
                        type="radio"
                        name="issueType"
                        value={opt.value}
                        checked={issueType === opt.value}
                        onChange={() => setIssueType(opt.value)}
                        className="h-4 w-4 accent-copper-500"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </fieldset>
                <label className="block text-xs font-semibold uppercase tracking-wide text-copper-600">
                  Note (optional)
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={280}
                    rows={3}
                    placeholder="Anything else the admin should know?"
                    className="mt-1 w-full rounded-lg border border-teal-700/20 bg-white px-3 py-2 text-sm text-teal-900 outline-none transition focus:border-copper-500 focus:ring-2 focus:ring-copper-300/40"
                  />
                </label>
                {error && (
                  <p className="text-sm text-copper-700" role="alert">
                    {error}
                  </p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
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
                    {busy ? "Sending…" : "Report"}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-teal-700">
                Thanks — the admin will review.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
