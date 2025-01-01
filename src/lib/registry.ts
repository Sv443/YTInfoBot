import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Collection, Events, Routes } from "discord.js";
import k from "kleur";
import { Col, useEmbedify } from "@lib/embedify.ts";
import { getHash } from "@lib/crypto.ts";
import { exists } from "@lib/misc.ts";
import type { ContextCommand, SlashCommand } from "@lib/Command.ts";
import type { Event } from "@lib/Event.ts";
import { client, clientId, rest } from "@lib/client.ts";
import { commands } from "@cmd/_commands.ts";
import { ctxCommands } from "@ctx/_contexts.ts";
import { events } from "@evt/_events.ts";

const reregisterCmds = Boolean(process.argv.find((arg) => ["--reregister", "-r"].includes(arg.toLowerCase())));

/** All slash and ctx command instances registered in `src/commands/_commands.ts` and `src/contexts/_contexts.ts` */
export const cmdInstances = new Collection<string, SlashCommand | ContextCommand>();
/** All event instances registered in `src/events/_events.ts` */
export const evtInstances = new Collection<string, Event>();

/** The path to the command hash file - it is used to reduce the amount of API calls to Discord (and the resulting rate limits) */
const cmdHashFile = resolve(".cmd_hash");

/** Registers all slash- and context-commands for all guilds (if they were changed), as well as registers listeners for them and for autocomplete */
async function registerGuildCommands() {
  for(const CmdClass of [...commands, ...ctxCommands]) {
    const cmd = new CmdClass();
    cmdInstances.set(cmd.name, cmd);
  }

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
          int[int.deferred || int.replied ? "editReply" : "reply"](useEmbedify(`An error occurred while executing the command: ${err}`, Col.Error));
        }
        catch(err) {
          console.error(`Error while executing command "${int.commandName}":`, err);
        }
      }
    }
    else if(int.isAutocomplete()) {
      try {
        const command = cmdInstances.get(int.commandName);

        if(!command || !("autocomplete" in command))
          return;

        await command.autocomplete?.(int);
      }
      catch(err) {
        console.error(`Error while executing autocomplete for command "${int.commandName}":`, err);
      }
    }
  });

  const lastHashExists = await exists(cmdHashFile);
  const lastCmdHash = lastHashExists
    ? String(await readFile(cmdHashFile)).replace(/\n/gm, "").trim()
    : "";
  const cmdJsons = [...cmdInstances.values()].map(cmd => cmd.builderJson);
  const newCmdHash = getHash(JSON.stringify(cmdJsons));

  if(lastCmdHash !== newCmdHash || reregisterCmds) {
    await writeFile(cmdHashFile, newCmdHash);

    const guilds = client.guilds.cache.map((g) => g.id);

    const promises = guilds.map(async (guildId) => {
      const data = await registerCommandsForGuild(guildId);

      console.log(k.magenta(`Registered ${(data as unknown[])?.length} guild commands for "${client.guilds.cache.find(g => g.id === guildId)?.name ?? guildId}"`));
    });

    await Promise.allSettled(promises);
  }
}

/** Registers all commands for the specified guild in the Discord API - can also be called at runtime to add commands to new guilds */
export async function registerCommandsForGuild(guildId: string) {
  const { signal, abort } = new AbortController(),
    timeout = setTimeout(() => abort(), 10_000),
    data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      {
        body: [...cmdInstances.entries()].map(([, cmd]) => cmd.builderJson),
        signal,
      },
    );
  clearTimeout(timeout);
  return data;
}

/** Registers all client events and their listeners */
async function registerEvents() {
  for(const EvtClass of events) {
    const evt = new EvtClass();
    evtInstances.set(evt.name, evt);

    try {
      client[evt.once ? "once" : "on"](evt.name as string, evt.run);
    }
    catch(err) {
      console.error(`Error while executing event "${evt.name}": ${err}`);
    }
  }
}

/** Called after the client is ready to initialize the commands and events */
export async function initRegistry() {
  return Promise.all([
    registerGuildCommands(),
    registerEvents(),
  ]);
}
