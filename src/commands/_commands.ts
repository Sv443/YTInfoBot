import { ConfigCmd } from "@cmd/Config.ts";
import { HelpCmd } from "@cmd/Help.ts";
import { InviteCmd } from "@cmd/Invite.ts";
import { SettingsCmd } from "@cmd/Settings.ts";
import { VideoInfoCmd } from "@cmd/VideoInfo.ts";

/** All slash commands to be registered */
export const commands = [
  new ConfigCmd(),
  new HelpCmd(),
  new InviteCmd(),
  new VideoInfoCmd(),
  new SettingsCmd(),
];
