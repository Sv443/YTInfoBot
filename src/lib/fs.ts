import { access, constants as fsconst } from "node:fs/promises";

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
