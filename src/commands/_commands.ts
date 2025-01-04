import { ConfigCmd } from "@cmd/Config.ts";
import { HelpCmd } from "@cmd/Help.ts";
import { InviteCmd } from "@cmd/Invite.ts";
import { PrivacyCmd } from "@cmd/Privacy.ts";
import { SettingsCmd } from "@cmd/Settings.ts";
import { VideoInfoCmd } from "@cmd/VideoInfo.ts";
import type { SlashCommand } from "@lib/Command.ts";
import type { Newable } from "@src/types.ts";

/** All slash commands to be registered */
export const commands = [
  ConfigCmd,
  HelpCmd,
  InviteCmd,
  PrivacyCmd,
  SettingsCmd,
  VideoInfoCmd,
] as const satisfies Array<Newable<SlashCommand>>;
