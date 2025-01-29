import { VideoInfoCtx, VideoInfoExtendedCtx } from "@ctx/VideoInfo.js";
import type { ContextCommand } from "@lib/Command.js";
import type { Newable } from "@src/types.js";

export const ctxCommands = [
  VideoInfoCtx,
  VideoInfoExtendedCtx,
] as const satisfies Array<Newable<ContextCommand>>;
