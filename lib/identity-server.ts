import { cookies } from "next/headers";

import { BROWSER_ID_COOKIE } from "./identity";

export async function getBrowserIdFromCookie(): Promise<string | null> {
  const c = await cookies();
  const v = c.get(BROWSER_ID_COOKIE)?.value;
  // UUID sanity check — anything else is treated as missing rather than
  // trusted, since the cookie is not httpOnly.
  if (!v) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) {
    return null;
  }
  return v;
}
