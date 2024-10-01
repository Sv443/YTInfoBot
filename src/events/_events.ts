import { GuildCreate } from "@evt/GuildCreate.ts";
import { GuildDelete } from "@evt/GuildDelete.ts";
import { MessageCreate } from "@evt/MessageCreate.ts";

/** All events that the bot listens for on the client instance */
export const events = [
  new GuildCreate(),
  new GuildDelete(),
  new MessageCreate(),
];
