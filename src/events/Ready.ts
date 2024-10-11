import type { Client } from "discord.js";
import pm2 from "@pm2/io";
import { em } from "@lib/db.ts";
import { Event } from "@lib/Event.ts";
import { registerCommandsForGuild } from "@lib/registry.ts";
import { GuildConfig } from "@models/GuildConfig.model.ts";

const metrics = {
  guilds: pm2.metric({ name: "Guilds", historic: true }),
  users: pm2.metric({ name: "Users", historic: true }),
};

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
    try {
      const tasks: Promise<void | unknown>[] = [];

      if(i === 0 || i % 10 === 0)
        tasks.push(ReadyEvt.updateMetrics(client));

      if(i === 0 || i % 20 === 0)
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

  //#region s:pm2 metrics

  /** Update pm2 metrics */
  private static async updateMetrics(client: Client) {
    const guilds = client.guilds.cache.size;
    const users = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

    metrics.guilds.set(guilds);
    metrics.users.set(users);
  }
}
