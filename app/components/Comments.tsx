"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { relativeTime } from "@/lib/time";

import { useIdentity } from "./IdentityProvider";

type Comment = {
  id: number;
  placeId: string;
  displayName: string;
  body: string;
  createdAt: string;
  updatedAt: string | null;
  mine: boolean;
};

const BODY_MAX = 1000;

export function CommentsButton({
  placeId,
  placeName,
  initialCount,
}: {
  placeId: string;
  placeName: string;
  initialCount: number;
}) {
  const [open, setOpen] = useState(false);
  const populated = initialCount > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Comments"
        title="Comments"
        className={
          populated
            ? "inline-flex items-center gap-1.5 rounded-full border border-copper-300 bg-copper-50 px-3 py-1 text-sm font-medium text-copper-700 shadow-sm transition hover:-translate-y-0.5 hover:border-copper-500 hover:bg-copper-100 active:scale-95"
            : "inline-flex items-center gap-1.5 rounded-full border border-teal-700/15 bg-transparent px-3 py-1 text-sm text-teal-700/35 transition hover:-translate-y-0.5 hover:border-copper-400 hover:bg-copper-50/60 hover:text-copper-700 active:scale-95"
        }
      >
        <span aria-hidden className={populated ? "text-base leading-none" : "text-base leading-none opacity-50"}>
          💬
        </span>
        {populated ? (
          <span className="tabular-nums text-xs">{initialCount}</span>
        ) : (
          <span className="text-xs opacity-60">—</span>
        )}
      </button>
      <CommentsModal
        placeId={placeId}
        placeName={placeName}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function CommentsModal({
  placeId,
  placeName,
  open,
  onClose,
}: {
  placeId: string;
  placeName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Comment[]>([]);
  const [composer, setComposer] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const { ensureDisplayName } = useIdentity();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Fetch the thread on open.
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch(`/api/comments?placeId=${encodeURIComponent(placeId)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`http_${r.status}`);
        return r.json();
      })
      .then((d: { comments: Comment[] }) => setItems(d.comments))
      .catch((e) => {
        console.error("comments fetch failed", e);
        setError("Couldn’t load comments.");
      })
      .finally(() => setLoading(false));
  }, [open, placeId]);

  // Focus the composer once the thread is loaded.
  useEffect(() => {
    if (open && !loading) queueMicrotask(() => composerRef.current?.focus());
  }, [open, loading]);

  const submit = async () => {
    if (busy) return;
    const trimmed = composer.trim();
    if (!trimmed) return;
    const displayName = await ensureDisplayName();
    if (!displayName) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ placeId, body: trimmed, displayName }),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const data = (await res.json()) as { comment: Comment };
      setItems((prev) => [data.comment, ...prev]);
      setComposer("");
      router.refresh();
    } catch (e) {
      console.error("comment submit failed", e);
      setError("Couldn’t post. Try again?");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (c: Comment) => {
    setEditingId(c.id);
    setEditingValue(c.body);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const saveEdit = async (id: number) => {
    const trimmed = editingValue.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const data = (await res.json()) as { comment: Comment };
      setItems((prev) => prev.map((c) => (c.id === id ? data.comment : c)));
      setEditingId(null);
      setEditingValue("");
    } catch (e) {
      console.error("comment edit failed", e);
      setError("Couldn’t save. Try again?");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this comment?")) return;
    const prev = items;
    setItems(items.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`http_${res.status}`);
      router.refresh();
    } catch (e) {
      console.error("comment delete failed", e);
      setItems(prev);
      setError("Couldn’t delete. Try again?");
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-teal-900/30 p-2 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Comments for ${placeName}`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col rounded-2xl bg-cream-50 shadow-xl sm:max-h-[calc(100dvh-2rem)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-copper-100 p-5 pb-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-copper-600">
              Comments
            </div>
            <h2
              title={placeName}
              className="mt-1 truncate text-lg font-semibold text-teal-900"
            >
              {placeName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 rounded-md p-1 text-xl leading-none text-teal-700/60 transition hover:bg-copper-50 hover:text-teal-900"
          >
            ×
          </button>
        </div>

        {/* Composer */}
        <div className="space-y-2 border-b border-copper-100 p-5 pt-3">
          <textarea
            ref={composerRef}
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
            }}
            maxLength={BODY_MAX}
            rows={3}
            placeholder="Favourite dish, queue tip…"
            className="w-full rounded-lg border border-teal-700/20 bg-white px-3 py-2 text-sm text-teal-900 outline-none transition focus:border-copper-500 focus:ring-2 focus:ring-copper-300/40"
          />
          <div className="flex items-center justify-between text-xs text-teal-700/60">
            <span>{composer.length}/{BODY_MAX}</span>
            <button
              type="button"
              onClick={submit}
              disabled={busy || !composer.trim()}
              className="rounded-lg bg-copper-500 px-3 py-1.5 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-copper-600 disabled:cursor-not-allowed disabled:bg-copper-300"
            >
              {busy ? "Posting…" : "Post"}
            </button>
          </div>
          {error && (
            <p className="text-sm text-copper-700" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* Thread */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5 pt-3">
          {loading ? (
            <p className="text-sm text-teal-700/60">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-teal-700/60">
              No comments yet — be the first.
            </p>
          ) : (
            <ul className="space-y-3">
              {items.map((c) => {
                const created = new Date(c.createdAt);
                const editedTouch =
                  c.updatedAt && new Date(c.updatedAt).getTime() !== created.getTime();
                const isEditing = editingId === c.id;
                return (
                  <li
                    key={c.id}
                    className="rounded-lg border border-copper-100 bg-white/80 p-3"
                  >
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-semibold text-teal-900">
                        {c.displayName}
                        {c.mine && (
                          <span className="ml-1 rounded bg-copper-100 px-1.5 py-0.5 text-[10px] font-medium text-copper-700">
                            you
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-teal-700/60">
                        {relativeTime(created)}
                        {editedTouch && (
                          <span className="ml-1 text-teal-700/40">· edited</span>
                        )}
                      </span>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          maxLength={BODY_MAX}
                          rows={3}
                          className="w-full rounded-lg border border-teal-700/20 bg-white px-3 py-2 text-sm text-teal-900 outline-none focus:border-copper-500 focus:ring-2 focus:ring-copper-300/40"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-md px-2 py-1 text-xs font-medium text-teal-700/70 transition hover:bg-copper-50 hover:text-teal-900"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(c.id)}
                            disabled={busy || !editingValue.trim()}
                            className="rounded-md bg-copper-500 px-2 py-1 text-xs font-semibold text-cream-50 shadow-sm transition hover:bg-copper-600 disabled:bg-copper-300"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap text-sm text-teal-900">
                          {c.body}
                        </p>
                        {c.mine && (
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => startEdit(c)}
                              className="text-teal-700/70 transition hover:text-teal-900 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(c.id)}
                              className="text-teal-700/70 transition hover:text-copper-700 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
