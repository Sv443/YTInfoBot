import { constants as fsconst, readFile } from "node:fs/promises";
import { exec } from "node:child_process";
import { createHash, type BinaryToTextEncoding } from "node:crypto";
import type { Stringifiable } from "@src/types.js";
import pkg from "@root/package.json" with { type: "json" };
import type { Message } from "discord.js";

/** The base URL for the GitHub repository, without trailing slash */
export const ghBaseUrl = pkg.repository.url.trim().replace(/(git\+)|(\.git)|(\/$)/g, "");

/** Checks if a file exists */
export async function exists(path: string) {
  try {
    await readFile(path, { flag: fsconst.R_OK | fsconst.W_OK });
    return true;
  }
  catch {
    return false;
  }
}

/** Gets the current Git commit hash */
export function getCommitHash(short = false) {
  return new Promise((res, rej) => {
    exec("git rev-parse HEAD",
      (err, stdout) => err
        ? rej("Error while getting Git commit hash")
        : res(short ? stdout.trim().substring(0, 7) : stdout.trim())
    );
  });
}

/** Creates a hash from the given stringifiable data */
export function getHash(data: Stringifiable, algorithm = "sha256", digest: BinaryToTextEncoding = "base64"): string {
  return createHash(algorithm)
    .update(String(data))
    .digest(digest);
}

/** Returns a permalink to the given message */
export function getMsgLink(msg: Message) {
  return `https://discord.com/channels/${msg.guildId}/${msg.channelId}/${msg.id}`;
}
