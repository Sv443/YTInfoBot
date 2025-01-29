import { GuildCreateEvt } from "@evt/GuildCreate.js";
import { GuildDeleteEvt } from "@evt/GuildDelete.js";
import { MessageCreateEvt } from "@evt/MessageCreate.js";
import type { Event } from "@lib/Event.js";
import type { Newable } from "@src/types.js";

export const events = [
  GuildCreateEvt,
  GuildDeleteEvt,
  MessageCreateEvt,
] as const satisfies Array<Newable<Event>>;
