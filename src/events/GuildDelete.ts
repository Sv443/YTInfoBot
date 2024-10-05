import type { Guild } from "discord.js";
import { Event } from "@lib/Event.ts";
import { em } from "@lib/db.ts";
import { GuildConfig } from "@models/GuildConfig.model.ts";

export class GuildDelete extends Event {
  constructor() {
    super("guildDelete");
  }

  public async run({ id }: Guild) {
    const cfg = await em.findOne(GuildConfig, { id });
    cfg && await em.removeAndFlush(cfg);
  }
}
