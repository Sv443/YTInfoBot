import { GuildCreateEvt } from "@evt/GuildCreate.ts";
import { GuildDeleteEvt } from "@evt/GuildDelete.ts";
import { MessageCreateEvt } from "@evt/MessageCreate.ts";
import type { Event } from "@lib/Event.ts";
import type { Newable } from "@src/types.ts";

export const events = [
  GuildCreateEvt,
  GuildDeleteEvt,
  MessageCreateEvt,
] as const satisfies Array<Newable<Event>>;
