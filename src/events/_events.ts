import { GuildCreateEvt } from "@evt/GuildCreate.ts";
import { GuildDeleteEvt } from "@evt/GuildDelete.ts";
import { MessageCreateEvt } from "@evt/MessageCreate.ts";
import { ReadyEvt } from "@evt/Ready.ts";

/** All events that the bot listens for on the client instance */
export const getEvents = () => [
  new GuildCreateEvt(),
  new GuildDeleteEvt(),
  new MessageCreateEvt(),
  new ReadyEvt(),
] as const;
