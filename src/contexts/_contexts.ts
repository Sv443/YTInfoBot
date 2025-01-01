import { VideoInfoCtx, VideoInfoExtendedCtx } from "@ctx/VideoInfo.ts";
import type { ContextCommand } from "@lib/Command.ts";

export const ctxCommands = [
  VideoInfoCtx,
  VideoInfoExtendedCtx,
] as const satisfies (new () => ContextCommand)[];
