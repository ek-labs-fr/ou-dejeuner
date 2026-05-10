"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function IssueRowActions({
  id,
  alreadyHidden,
}: {
  id: number;
  alreadyHidden: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const send = async (action: "dismiss" | "resolve_by_hiding") => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/closure-reports/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      router.refresh();
    } catch (err) {
      console.error("issue action failed", err);
      alert("Failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={() => send("resolve_by_hiding")}
        disabled={busy || alreadyHidden}
        title={alreadyHidden ? "Restaurant already hidden" : "Hide restaurant + close"}
        className="rounded-md bg-copper-500 px-2 py-1 text-xs font-semibold text-cream-50 transition hover:bg-copper-600 disabled:bg-copper-300"
      >
        Hide
      </button>
      <button
        type="button"
        onClick={() => send("dismiss")}
        disabled={busy}
        className="rounded-md border border-teal-700/30 px-2 py-1 text-xs font-semibold text-teal-700 transition hover:bg-teal-50 disabled:opacity-60"
      >
        Dismiss
      </button>
    </div>
  );
}
