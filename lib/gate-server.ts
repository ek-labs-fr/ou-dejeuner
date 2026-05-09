// Server-component-only helpers — anything pulling `next/headers` lives here
// so middleware (Edge) doesn't drag those imports into its bundle.

import { cookies } from "next/headers";

import {
  GATE_COOKIE_NAME,
  type Tier,
  verifyGateCookie,
} from "./gate";

export async function getTier(): Promise<Tier | null> {
  const c = await cookies();
  const value = c.get(GATE_COOKIE_NAME)?.value;
  if (!value) return null;
  const payload = await verifyGateCookie(value);
  return payload?.tier ?? null;
}
