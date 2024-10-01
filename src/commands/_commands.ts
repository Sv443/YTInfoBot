import { Configure } from "@cmd/Configure.ts";
import { VideoInfo } from "@cmd/VideoInfo.ts";

/** All slash commands to be registered */
export const commands = [
  new Configure(),
  new VideoInfo(),
];
