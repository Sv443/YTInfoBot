import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import k from "kleur";
import { Collection, Events, Routes } from "discord.js";
import { client, rest, botToken, clientId } from "@/lib/client.ts";
import { initDatabase } from "@lib/db.ts";
import { useEmbedify } from "@lib/embedify.ts";
import { getHash } from "@lib/crypto.ts";
import { exists } from "@lib/fs.ts";
import { commands } from "@cmd/_commands.ts";
import type { SlashCommand } from "@lib/SlashCommand.ts";
import type { ContextCommand } from "@lib/ContextCommand.ts";

const cmdInstances = new Collection<string, SlashCommand | ContextCommand>();

async function init() {
  console.log(k.gray("\nLogging in..."));
  await Promise.all([
    initDatabase(),
    new Promise((resolve) => {
      client.once("ready", resolve);
      client.login(botToken);
    }),
  ]);

  run();
}

async function registerCommands() {
  for(const cmd of commands)
    cmdInstances.set(cmd.name, cmd);

  client.on(Events.InteractionCreate, async (int) => {
    if(int.isCommand() || int.isContextMenuCommand()) {
      try {
        const command = cmdInstances.get(int.commandName);

        if(!command)
          return;

        const opt = int.options.data?.[0];

        await command.run(int, opt);
      }
      catch(err) {
        try {
          int.reply(useEmbedify(`An error occurred while executing the command: ${err}`));
        }
        catch(err) {
          console.error(`Error while executing command "${int.commandName}":`, err);
        }
      }
    }
  });

  const lastCmdHash = await exists(".cmd_hash")
    ? String(await readFile(".cmd_hash")).replace(/\n/gm, "").trim()
    : "";
  const cmdJsons = [...cmdInstances.values()].map(cmd => cmd.builderJson);
  const newCmdHash = getHash(JSON.stringify(cmdJsons));

  if(lastCmdHash !== newCmdHash) {
    await writeFile(".cmd_hash", newCmdHash);

    const guilds = client.guilds.cache.map((g) => g.id);
    const cmdBody = [...cmdInstances.entries()].map(([_, cmd]) => cmd.builder.toJSON());

    const promises: Promise<void>[] = [];

    for(const guildId of guilds)
      promises.push(new Promise(async (resolve) => {
        const data = await rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: cmdBody },
        );

        console.log(k.gray(`Registered ${(data as unknown[])?.length} commands for guild "${client.guilds.cache.find(g => g.id === guildId)?.name ?? guildId}"`));
        resolve();
      }));

    await Promise.allSettled(promises);
  }
}

async function run() {
  await registerCommands();

  console.log(`${k.blue("Bot is ready")}`);
}

init();
