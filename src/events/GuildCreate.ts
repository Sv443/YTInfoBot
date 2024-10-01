import type { Guild } from "discord.js";
import { Event } from "@lib/Event.ts";
import { em } from "@lib/db.ts";
import { GuildConfig } from "@models/GuildConfig.model.ts";
import { registerCommandsForGuild } from "@lib/registry.ts";

export class GuildCreate extends Event {
  constructor() {
    super("guildCreate");
  }

  public async run({ id }: Guild) {
    await em.persistAndFlush(new GuildConfig(id));
    await registerCommandsForGuild(id);
  }
}
