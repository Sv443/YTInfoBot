import type { Guild } from "discord.js";
import { Event } from "@lib/Event.js";
import { em } from "@lib/db.js";
import { GuildConfig } from "@models/GuildConfig.model.js";

export class GuildDeleteEvt extends Event {
  constructor() {
    super("guildDelete");
  }

  //#region pb:run

  public async run({ id }: Guild) {
    const cfg = await em.findOne(GuildConfig, { id });
    cfg && await em.removeAndFlush(cfg);
  }
}
