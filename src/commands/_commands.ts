import { Configure } from "@/commands/Configure.ts";
import { VideoInfo } from "@/commands/VideoInfo.ts";

export const commands = [
  new Configure(),
  new VideoInfo(),
];
