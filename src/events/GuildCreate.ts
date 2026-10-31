import type { Guild } from "discord.js";
import { Event } from "@lib/Event.js";
import { em } from "@lib/db.js";
import { GuildConfig } from "@models/GuildConfig.model.js";
import { registerCommandsForGuild } from "@lib/registry.js";

export class GuildCreateEvt extends Event {
  constructor() {
    super("guildCreate");
  }

  //#region pb:run

  public async run({ id }: Guild) {
    if(!await em.findOne(GuildConfig, { id }))
      await em.persist(new GuildConfig(id)).flush();
    await registerCommandsForGuild(id);
  }
}
