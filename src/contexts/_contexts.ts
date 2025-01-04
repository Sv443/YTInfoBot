import { VideoInfoCtx, VideoInfoExtendedCtx } from "@ctx/VideoInfo.ts";
import type { ContextCommand } from "@lib/Command.ts";
import type { Newable } from "@src/types.ts";

export const ctxCommands = [
  VideoInfoCtx,
  VideoInfoExtendedCtx,
] as const satisfies Array<Newable<ContextCommand>>;
