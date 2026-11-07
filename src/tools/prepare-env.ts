import { cp, constants, readFile } from "node:fs/promises";
import { styleText } from "node:util";

const copyIfNotExists = [
  { template: ".env.template", copyTo: ".env" },
  { template: "src/assets/emojis.template.json", copyTo: "src/assets/emojis.json" },
];

async function exists(path: string) {
  try {
    await readFile(path, { flag: constants.F_OK | constants.R_OK });
    return true;
  }
  catch {
    return false;
  }
}

let modified = 0;

async function run() {
  for(const { template: from, copyTo: to } of copyIfNotExists) {
    try {
      if(!await exists(to)) {
        await cp(from, to);
        modified++;
        console.log(styleText("green", `- Successfully created file '${to}'`), styleText("gray", `(from template at '${from}')`));
      }
      else
        console.log(styleText("gray", `- File '${to}' already exists, skipping...`));
    }
    catch(err) {
      throw new Error(styleText("red", `!! Failed to copy '${from}' to '${to}':`), { cause: err });
    }
  }
}

run().then(() => setImmediate(() => {
  if(modified > 0)
    console.log(styleText("green", `\n> Created ${modified} ${styleText("bold", "file" + (modified !== 1 ? "s" : ""))}.\n`));
  else
    console.log(styleText("gray", "\n> No files have been created.\n"));
  process.exit(0);
})).catch(err => setImmediate(() => {
  console.log(styleText("red", "Encountered error:\n"), err);
  process.exit(1);
}));
