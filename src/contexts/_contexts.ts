import { DeleteReplyCtx } from "@ctx/DeleteReply.js";
import { VideoInfoCtx, VideoInfoExtendedCtx } from "@ctx/VideoInfo.js";
import type { ContextCommand } from "@lib/Command.js";
import type { Newable } from "@src/types.js";

export const ctxCommands = [
  DeleteReplyCtx,
  VideoInfoCtx,
  VideoInfoExtendedCtx,
] as const satisfies Array<Newable<ContextCommand>>;
