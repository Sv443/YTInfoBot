import { ConfigCmd } from "@cmd/Config.js";
import { HelpCmd } from "@cmd/Help.js";
import { InviteCmd } from "@cmd/Invite.js";
import { PrivacyCmd } from "@cmd/Privacy.js";
import { SettingsCmd } from "@cmd/Settings.js";
import { VideoInfoCmd } from "@cmd/VideoInfo.js";
import type { SlashCommand } from "@lib/Command.js";
import type { Newable } from "@src/types.js";

/** All slash commands to be registered */
export const commands = [
  ConfigCmd,
  HelpCmd,
  InviteCmd,
  PrivacyCmd,
  SettingsCmd,
  VideoInfoCmd,
] as const satisfies Array<Newable<SlashCommand>>;
