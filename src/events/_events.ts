import { GuildCreateEvt } from "@evt/GuildCreate.ts";
import { GuildDeleteEvt } from "@evt/GuildDelete.ts";
import { MessageCreateEvt } from "@evt/MessageCreate.ts";
import { ReadyEvt } from "@evt/Ready.ts";

export const events = [
  GuildCreateEvt,
  GuildDeleteEvt,
  MessageCreateEvt,
  ReadyEvt,
] as const;
