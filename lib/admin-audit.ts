// Helper for writing to the admin_audit_log table. Single function so
// every admin endpoint records its action consistently. Caller passes the
// underlying transaction or db handle so the audit row commits in the same
// transaction as the mutation it describes — a failed mutation leaves no
// phantom audit entry.

import type { Db } from "@/src/db/client";
import { adminAuditLog, type AdminAuditAction } from "@/src/db/schema";

type Tx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export type LogOpts = {
  targetType?: string;
  targetId?: string | number | null;
  payload?: Record<string, unknown> | null;
};

export function logAdminAction(
  tx: Tx,
  action: AdminAuditAction,
  opts: LogOpts = {},
): void {
  tx.insert(adminAuditLog)
    .values({
      action,
      targetType: opts.targetType ?? null,
      targetId: opts.targetId == null ? null : String(opts.targetId),
      payload: opts.payload ?? null,
    })
    .run();
}
