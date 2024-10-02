import { Configure } from "@cmd/Configure.ts";
import { Help } from "@cmd/Help.ts";
import { Invite } from "@cmd/Invite.ts";
import { Settings } from "@cmd/Settings.ts";
import { VideoInfo } from "@cmd/VideoInfo.ts";

/** All slash commands to be registered */
export const commands = [
  new Configure(),
  new Help(),
  new Invite(),
  new VideoInfo(),
  new Settings(),
];
