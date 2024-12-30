import { VideoInfoCtx, VideoInfoExtendedCtx } from "@ctx/VideoInfo.ts";

export const getCtxCommands = () => [
  new VideoInfoCtx(),
  new VideoInfoExtendedCtx(),
] as const;
