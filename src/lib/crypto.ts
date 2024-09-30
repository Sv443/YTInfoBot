import { createHash } from "node:crypto";
import type { Stringifiable } from "@lib/types.ts";

/** Creates a hash from the given stringifiable data */
export function getHash(data: Stringifiable): string {
  return createHash("sha256")
    .update(String(data))
    .digest("hex");
}
