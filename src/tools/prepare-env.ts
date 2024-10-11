import { cp, access, constants } from "node:fs/promises";
import k from "kleur";

console.log("\nRunning prepare-env script...");

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
      console.log(k.green(`Successfully created file '${to}'`), `from template '${from}'`);
    }
    else
      console.log(k.gray(`File '${to}' already exists, skipping...`));
  }
  catch(err) {
    console.error(k.red(`Failed to copy '${from}' to '${to}':`), err);
  }
}

setImmediate(() => {
  console.log("Done!\n");
  process.exit(0);
});
