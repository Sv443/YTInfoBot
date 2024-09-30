import { createHash } from "node:crypto";

export function getHash(data: string): string {
  return createHash("sha256")
    .update(data)
    .digest("hex");
}
