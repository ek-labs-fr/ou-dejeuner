"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BanForm() {
  const [browserId, setBrowserId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !browserId.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/bans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          browserId: browserId.trim(),
          reason: reason.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      setBrowserId("");
      setReason("");
      router.refresh();
    } catch (err) {
      console.error("ban create failed", err);
      setError("Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-teal-700/15 bg-white p-3 text-sm"
    >
      <label className="flex-1 space-y-1">
        <span className="text-xs uppercase tracking-wide text-teal-700/70">
          Browser ID
        </span>
        <input
          type="text"
          value={browserId}
          onChange={(e) => setBrowserId(e.target.value)}
          placeholder="UUID"
          className="w-full rounded-md border border-teal-700/20 bg-white px-2 py-1.5 font-mono text-xs text-teal-900 outline-none focus:border-copper-500 focus:ring-2 focus:ring-copper-300/40"
        />
      </label>
      <label className="flex-[2] space-y-1">
        <span className="text-xs uppercase tracking-wide text-teal-700/70">
          Reason (optional)
        </span>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={280}
          className="w-full rounded-md border border-teal-700/20 bg-white px-2 py-1.5 text-sm text-teal-900 outline-none focus:border-copper-500 focus:ring-2 focus:ring-copper-300/40"
        />
      </label>
      <button
        type="submit"
        disabled={busy || !browserId.trim()}
        className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-semibold text-cream-50 transition hover:bg-teal-800 disabled:opacity-60"
      >
        Ban
      </button>
      {error && <span className="text-xs text-copper-700">{error}</span>}
    </form>
  );
}

export function BanRowActions({ browserId }: { browserId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const onWipe = async () => {
    if (
      !confirm(
        "Delete ALL content from this browser ID (comments, reactions, tags, issue reports)? Pending submissions will be marked withdrawn. Hard delete.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/bans/${encodeURIComponent(browserId)}/wipe`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const data = (await res.json()) as { counts: Record<string, number> };
      alert(
        `Wiped: ${Object.entries(data.counts)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ")}`,
      );
      router.refresh();
    } catch (err) {
      console.error("wipe failed", err);
      alert("Wipe failed.");
    } finally {
      setBusy(false);
    }
  };

  const onUnban = async () => {
    if (!confirm("Lift the ban on this browser ID?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/bans/${encodeURIComponent(browserId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      router.refresh();
    } catch (err) {
      console.error("unban failed", err);
      alert("Unban failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={onWipe}
        disabled={busy}
        className="rounded-md bg-copper-500 px-2 py-1 text-xs font-semibold text-cream-50 transition hover:bg-copper-600 disabled:bg-copper-300"
      >
        Wipe content
      </button>
      <button
        type="button"
        onClick={onUnban}
        disabled={busy}
        className="rounded-md border border-teal-700/30 px-2 py-1 text-xs font-semibold text-teal-700 transition hover:bg-teal-50 disabled:opacity-60"
      >
        Unban
      </button>
    </div>
  );
}
