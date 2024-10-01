import type { Guild } from "discord.js";
import { Event } from "@lib/Event.ts";
import { em } from "@lib/db.ts";
import { GuildConfig } from "@models/GuildSettings.model.ts";

export class GuildDelete extends Event {
  constructor() {
    super("guildDelete");
  }

  public async run({ id }: Guild) {
    await em.nativeDelete(GuildConfig, { id });
  }
}
