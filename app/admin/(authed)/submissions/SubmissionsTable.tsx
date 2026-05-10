"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ApprovalModal, type SubmissionForApproval } from "./ApprovalModal";

export type SubmissionRow = {
  id: number;
  displayName: string;
  browserId: string;
  sourceUrl: string | null;
  nameInput: string | null;
  addressInput: string | null;
  submittedAt: string;
};

const MAX_BULK = 25;

export function SubmissionsTable({ rows }: { rows: SubmissionRow[] }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<string | null>(null);
  const [approving, setApproving] = useState<SubmissionForApproval | null>(null);
  const router = useRouter();

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAll = () =>
    setSelected(new Set(rows.slice(0, MAX_BULK).map((r) => r.id)));

  const clearAll = () => setSelected(new Set());

  const bulkReject = async () => {
    if (selected.size === 0 || busy) return;
    const reason = prompt(
      `Reject ${selected.size} submission${selected.size === 1 ? "" : "s"}? Optional reason:`,
      "",
    );
    if (reason === null) return;
    setBusy(true);
    setResults(null);
    try {
      const res = await fetch("/api/admin/submissions/bulk-reject", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selected),
          reason: reason || undefined,
        }),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      setResults(`Rejected ${selected.size}.`);
      clearAll();
      router.refresh();
    } catch (err) {
      console.error("bulk reject failed", err);
      setResults("Bulk reject failed — see console.");
    } finally {
      setBusy(false);
    }
  };

  const singleReject = async (id: number) => {
    if (busy) return;
    const reason = prompt("Reject this submission? Optional reason:", "");
    if (reason === null) return;
    setBusy(true);
    setResults(null);
    try {
      const res = await fetch(`/api/admin/submissions/${id}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(reason ? { reason } : {}),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setResults(`Reject failed: ${data.error ?? res.status}`);
        return;
      }
      setResults("Rejected.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {results && (
        <div className="rounded-lg border border-teal-700/30 bg-teal-50 p-3 text-sm text-teal-900">
          {results}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={selectAll}
          disabled={busy || rows.length === 0}
          className="rounded-md border border-teal-700/30 bg-white px-2 py-1 text-xs font-medium text-teal-800 transition hover:border-teal-700 disabled:opacity-50"
        >
          Select up to {Math.min(rows.length, MAX_BULK)}
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={busy || selected.size === 0}
          className="rounded-md border border-teal-700/30 bg-white px-2 py-1 text-xs font-medium text-teal-800 transition hover:border-teal-700 disabled:opacity-50"
        >
          Clear
        </button>
        <span className="text-xs text-teal-700/70">{selected.size} selected</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-teal-700/15 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-teal-700/10 bg-teal-50/40 text-left text-xs uppercase tracking-wide text-teal-700/70">
            <tr>
              <th className="w-8 px-3 py-2"></th>
              <th className="px-3 py-2">Submission</th>
              <th className="px-3 py-2">Submitter</th>
              <th className="px-3 py-2">Submitted</th>
              <th className="w-44 px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-teal-700/5 last:border-0 hover:bg-teal-50/30"
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    disabled={
                      busy ||
                      (!selected.has(r.id) && selected.size >= MAX_BULK)
                    }
                    className="h-4 w-4 accent-copper-500"
                  />
                </td>
                <td className="px-3 py-2">
                  {r.sourceUrl ? (
                    <a
                      href={r.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block max-w-md truncate text-teal-800 hover:underline"
                      title={r.sourceUrl}
                    >
                      {r.sourceUrl}
                    </a>
                  ) : (
                    <div>
                      <div className="font-medium text-teal-900">{r.nameInput}</div>
                      <div className="text-xs text-teal-700/70">{r.addressInput}</div>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-teal-800">
                  <div>{r.displayName}</div>
                  <div className="font-mono text-[10px] text-teal-700/50">
                    {r.browserId.slice(0, 8)}…
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-teal-700/70">
                  {new Date(r.submittedAt).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setApproving({
                          id: r.id,
                          sourceUrl: r.sourceUrl,
                          nameInput: r.nameInput,
                          addressInput: r.addressInput,
                        })
                      }
                      disabled={busy}
                      className="rounded-md bg-teal-700 px-2 py-1 text-xs font-semibold text-cream-50 transition hover:bg-teal-800 disabled:opacity-60"
                    >
                      Approve…
                    </button>
                    <button
                      type="button"
                      onClick={() => singleReject(r.id)}
                      disabled={busy}
                      className="rounded-md border border-copper-400 px-2 py-1 text-xs font-semibold text-copper-700 transition hover:bg-copper-50 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected.size > 0 && (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-teal-700/20 bg-cream-50/95 px-4 py-3 shadow-lg backdrop-blur sm:rounded-t-xl">
          <div className="text-sm text-teal-800">{selected.size} selected</div>
          <button
            type="button"
            onClick={bulkReject}
            disabled={busy}
            className="rounded-md border border-copper-400 px-3 py-1.5 text-sm font-semibold text-copper-700 transition hover:bg-copper-50 disabled:opacity-60"
          >
            Reject {selected.size}
          </button>
        </div>
      )}

      <ApprovalModal
        submission={approving}
        onClose={() => setApproving(null)}
      />
    </div>
  );
}
