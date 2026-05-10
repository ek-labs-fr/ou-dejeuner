"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Submission = {
  id: number;
  sourceUrl: string | null;
  nameInput: string | null;
  addressInput: string | null;
  submittedAt: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
};

export function MySubmissionsPanel({ open, onClose, onChanged }: Props) {
  const [items, setItems] = useState<Submission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setItems(null);
    void (async () => {
      try {
        const res = await fetch("/api/submissions");
        if (!res.ok) throw new Error(`http_${res.status}`);
        const data = (await res.json()) as { submissions: Submission[] };
        setItems(data.submissions);
      } catch (err) {
        console.error("load submissions failed", err);
        setError("Couldn’t load your submissions.");
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && withdrawing === null) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, withdrawing, onClose]);

  if (!open) return null;

  const onWithdraw = async (id: number) => {
    setWithdrawing(id);
    setError(null);
    try {
      const res = await fetch(`/api/submissions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`http_${res.status}`);
      setItems((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
      onChanged?.();
      router.refresh();
    } catch (err) {
      console.error("withdraw failed", err);
      setError("Couldn’t withdraw — try again?");
    } finally {
      setWithdrawing(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-teal-900/30 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={() => withdrawing === null && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="My pending submissions"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-2xl bg-cream-50 p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-teal-900">
            My pending submissions
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 rounded-md p-1 text-xl leading-none text-teal-700/60 transition hover:bg-copper-50 hover:text-teal-900"
          >
            ×
          </button>
        </div>

        {error && (
          <p className="text-sm text-copper-700" role="alert">
            {error}
          </p>
        )}

        {items === null ? (
          <p className="text-sm text-teal-700/70">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-teal-700/70">
            Nothing pending. Submissions you make will show up here until the
            admin reviews them.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-teal-700/15 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {s.sourceUrl ? (
                      <a
                        href={s.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-sm font-medium text-teal-800 hover:underline"
                        title={s.sourceUrl}
                      >
                        {s.sourceUrl}
                      </a>
                    ) : (
                      <>
                        <div className="truncate text-sm font-medium text-teal-900">
                          {s.nameInput}
                        </div>
                        <div className="truncate text-xs text-teal-700/70">
                          {s.addressInput}
                        </div>
                      </>
                    )}
                    <div className="mt-1 text-[11px] text-teal-700/50">
                      Submitted {formatDate(new Date(s.submittedAt))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onWithdraw(s.id)}
                    disabled={withdrawing !== null}
                    className="shrink-0 rounded-md border border-copper-300 px-2 py-1 text-xs font-medium text-copper-700 transition hover:border-copper-500 hover:bg-copper-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {withdrawing === s.id ? "Withdrawing…" : "Withdraw"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
