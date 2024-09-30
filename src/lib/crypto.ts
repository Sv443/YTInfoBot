import { createHash } from "node:crypto";

/** Creates a hash from the given stringifiable data */
export function getHash(data: string | { toString(): string }): string {
  return createHash("sha256")
    .update(String(data))
    .digest("hex");
}
