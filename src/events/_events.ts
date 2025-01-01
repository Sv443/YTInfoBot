import { GuildCreateEvt } from "@evt/GuildCreate.ts";
import { GuildDeleteEvt } from "@evt/GuildDelete.ts";
import { MessageCreateEvt } from "@evt/MessageCreate.ts";

export const events = [
  GuildCreateEvt,
  GuildDeleteEvt,
  MessageCreateEvt,
] as const;
