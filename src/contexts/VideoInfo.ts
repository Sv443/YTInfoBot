import { MessageCreateEvt } from "@evt/MessageCreate.js";
import { ContextCommand } from "@lib/Command.js";
import { Col, useEmbedify } from "@lib/embedify.js";
import { getLocMap, tr } from "@lib/translate.js";
import { ApplicationCommandType, ContextMenuCommandBuilder, InteractionContextType, type ContextMenuCommandInteraction } from "discord.js";

//#region c:basic

/** Reply with video info using the server's default type or "everything" as a fallback */
export class VideoInfoCtx extends ContextCommand {
  constructor() {
    super(new ContextMenuCommandBuilder()
      .setName(tr.for("en-US", "commands.video_info_ctx.nameReduced"))
      .setNameLocalizations(getLocMap("commands.video_info_ctx.nameReduced"))
      .setType(ApplicationCommandType.Message as number)
      .setContexts([
        InteractionContextType.Guild,
        InteractionContextType.PrivateChannel,
      ])
    );
  }

  //#region pb:run

  public async run(int: ContextMenuCommandInteraction) {
    await int.deferReply();

    const fetchColl = await int.channel?.messages.fetch({ limit: 1, around: int.targetId });
    const targetMsg = fetchColl?.get(int.targetId);
    const locale = await VideoInfoCtx.getGuildLocale(int);

    if(!targetMsg)
      return int.editReply({
        ...useEmbedify(tr.for(locale, "errors.messageInaccessible"), Col.Error),
      });

    return await MessageCreateEvt.handleYtLinkMsg(targetMsg, int);
  }
}

//#region c:extended

/** Reply with video info using "everything" as the type */
export class VideoInfoExtendedCtx extends ContextCommand {
  constructor() {
    super(new ContextMenuCommandBuilder()
      .setName(tr.for("en-US", "commands.video_info_ctx.nameExtended"))
      .setNameLocalizations(getLocMap("commands.video_info_ctx.nameExtended"))
      .setType(ApplicationCommandType.Message as number)
      .setContexts([
        InteractionContextType.Guild,
        InteractionContextType.PrivateChannel,
      ])
    );
  }

  //#region pb:run

  public async run(int: ContextMenuCommandInteraction) {
    await int.deferReply();

    const fetchColl = await int.channel?.messages.fetch({ limit: 1, around: int.targetId });
    const targetMsg = fetchColl?.get(int.targetId);
    const locale = await VideoInfoExtendedCtx.getGuildLocale(int);

    if(!targetMsg)
      return int.editReply({
        ...useEmbedify(tr.for(locale, "errors.messageInaccessible"), Col.Error),
      });

    return await MessageCreateEvt.handleYtLinkMsg(targetMsg, int, "everything");
  }
}
