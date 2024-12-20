import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Collection, Events, Routes } from "discord.js";
import k from "kleur";
import { Col, useEmbedify } from "@lib/embedify.ts";
import { getHash } from "@lib/crypto.ts";
import { exists } from "@lib/fs.ts";
import { commands } from "@cmd/_commands.ts";
import { contextCommands } from "@ctx/_contexts.ts";
import { events } from "@evt/_events.ts";
import type { ContextCommand, SlashCommand } from "@lib/Command.ts";
import type { Event } from "@lib/Event.ts";
import { client, clientId, rest } from "@lib/client.ts";

const cmdInstances = new Collection<string, SlashCommand | ContextCommand>();
const evtInstances = new Collection<string, Event>();

/** Returns the JSON data of each command builder instance */
const getCommandsJson = () => [...cmdInstances.entries()].map(([, cmd]) => cmd.builderJson);

/** The path to the command hash file - it is used to reduce the amount of API calls to Discord (and the resulting rate limits) */
const cmdHashFile = resolve(".cmd_hash");

/** Registers all slash- and context-commands for all guilds (if they were changed), as well as registers listeners for them and for autocomplete */
async function registerGuildCommands() {
  for(const cmd of [...commands, ...contextCommands])
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

  if(lastCmdHash !== newCmdHash) {
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
export function registerCommandsForGuild(guildId: string) {
  return rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: getCommandsJson() },
  );
}

/** Registers all client events and their listeners */
async function registerEvents() {
  for(const evt of events)
    evtInstances.set(evt.name, evt);

  for(const [evtName, evt] of evtInstances) {
    try {
      client[evt.once ? "once" : "on"](evtName, evt.run);
    }
    catch(err) {
      console.error(`Error while executing event "${evtName}": ${err}`);
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
