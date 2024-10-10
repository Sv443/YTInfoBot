import { em } from "@lib/db.ts";
import { Event } from "@lib/Event.ts";
import { registerCommandsForGuild } from "@lib/registry.ts";
import { GuildConfig } from "@models/GuildConfig.model.ts";
import type { Client } from "discord.js";

export class ReadyEvt extends Event {
  constructor() {
    super("ready");
  }

  //#region pb:run

  public async run(client: Client) {
    let i = 0;
    setInterval(() => {
      i++;
      ReadyEvt.intervalChecks(client, i);
    }, 1_000);
    ReadyEvt.intervalChecks(client, i);
  }

  //#region s:intervalChecks

  /** Runs all interval checks */
  public static async intervalChecks(client: Client, i: number) {
    if(i === 0)
      return;
    try {
      const tasks: Promise<void | unknown>[] = [];
      if(i % 20 === 0)
        tasks.push(ReadyEvt.checkGuildJoin(client));

      await Promise.allSettled(tasks);
    }
    catch(e) {
      console.error("Couldn't run interval checks:", e);
    }
  }

  //#region s:chkGuildJoin

  /** Checks if guilds were joined while the bot was offline and creates a GuildConfig for it and registers its slash commands */
  private static async checkGuildJoin(client: Client) {
    const registeredGuilds = await em.findAll(GuildConfig);
    const guilds = [...client.guilds.cache.values()];

    for(const guild of guilds)
      if(!registeredGuilds.some(g => g.id === guild.id))
        await Promise.allSettled([
          em.persistAndFlush(new GuildConfig(guild.id)),
          registerCommandsForGuild(guild.id),
        ]);
  }
}
