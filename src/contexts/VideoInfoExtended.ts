import { MessageCreateEvt } from "@evt/MessageCreate.js";
import { ContextCommand } from "@lib/Command.js";
import { Col, useEmbedify } from "@lib/embedify.js";
import { getLocMap, tr } from "@lib/translate.js";
import { ApplicationCommandType, ContextMenuCommandBuilder, InteractionContextType, type ContextMenuCommandInteraction } from "discord.js";

//#region c:extended video info

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
    const t = await VideoInfoExtendedCtx.getTrFunc(int);

    if(!targetMsg)
      return int.editReply({
        ...useEmbedify(t("errors.messageInaccessible"), Col.Error),
      });

    return await MessageCreateEvt.handleYtLinkMsg(targetMsg, int, "everything");
  }
}
