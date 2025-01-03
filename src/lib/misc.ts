import { access, constants as fsconst } from "node:fs/promises";
import { exec } from "node:child_process";
import packageJson from "@root/package.json" with { type: "json" };

/** The base URL for the GitHub repository, without trailing slash */
export const ghBaseUrl = packageJson.repository.url.replace(/(git\+)|(\.git)/g, "");

/** Checks if a file exists */
export async function exists(path: string) {
  try {
    await access(path, fsconst.R_OK | fsconst.W_OK);
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
