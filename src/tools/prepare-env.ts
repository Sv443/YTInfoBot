import { cp, access, constants } from "node:fs/promises";
import k from "kleur";

const copyIfNotExists = [
  { template: ".env.template", copyTo: ".env" },
  { template: "src/assets/emojis.template.json", copyTo: "src/assets/emojis.json" },
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

let modified = 0;

for(const { template: from, copyTo: to } of copyIfNotExists) {
  try {
    if(!await exists(to)) {
      await cp(from, to);
      modified++;
      console.log(k.green(`- Successfully created file '${to}'`), k.gray(`(from template at '${from}')`));
    }
    else
      console.log(k.gray(`- File '${to}' already exists, skipping...`));
  }
  catch(err) {
    console.error(k.red(`!! Failed to copy '${from}' to '${to}':`), err);
  }
}

setImmediate(() => {
  if(modified > 0)
    console.log(k.green(`\n> Created ${modified} ${k.bold("file" + (modified !== 1 ? "s" : ""))}.\n`));
  else
    console.log(k.gray("\n> No files have been created.\n"));
  process.exit(0);
});
