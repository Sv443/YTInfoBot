import { createHash, type BinaryToTextEncoding } from "node:crypto";
import type { Stringifiable } from "@src/types.ts";

/** Creates a hash from the given stringifiable data */
export function getHash(data: Stringifiable, algorithm = "sha256", digest: BinaryToTextEncoding = "base64"): string {
  return createHash(algorithm)
    .update(String(data))
    .digest(digest);
}
