"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReactionRowActions({
  browserId,
  placeId,
}: {
  browserId: string;
  placeId: string;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const onDelete = async () => {
    if (!confirm("Delete this reaction?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/reactions", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ browserId, placeId }),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      router.refresh();
    } catch (err) {
      console.error("delete failed", err);
      alert("Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={busy}
      className="rounded-md border border-copper-400 px-2 py-1 text-xs font-semibold text-copper-700 transition hover:bg-copper-50 disabled:opacity-60"
    >
      {busy ? "…" : "Delete"}
    </button>
  );
}
