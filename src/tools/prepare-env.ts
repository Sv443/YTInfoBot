import { cp, access, constants } from "node:fs/promises";

console.log("Running prepare-env script...");

const copyIfNotExists = [
  { from: "src/assets/emojis.template.json", to: "src/assets/emojis.json" },
  { from: ".env.template", to: ".env" },
];

async function exists(path: string) {
  try {
    await access(path, constants.W_OK | constants.F_OK | constants.R_OK);
    return true;
  }
  catch {
    return false;
  }
}

for(const { from, to } of copyIfNotExists) {
  try {
    if(!await exists(to)) {
      await cp(from, to);
      console.log(`Copied '${from}' to '${to}'`);
    }
    else
      console.log(`File '${to}' already exists, skipping...`);
  }
  catch(err) {
    console.error(`Failed to copy '${from}' to '${to}':`, err);
  }
}

setImmediate(() => {
  console.log("Done!");
  process.exit(0);
});
