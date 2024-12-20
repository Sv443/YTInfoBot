import { MessageCreateEvt } from "@evt/MessageCreate.ts";
import { ContextCommand } from "@lib/Command.ts";
import { ApplicationCommandType, ContextMenuCommandBuilder, InteractionContextType, type ContextMenuCommandInteraction } from "discord.js";

//#region c:basic

/** Reply with video info using the server's default type or "reduced" as a fallback */
export class VideoInfoCtx extends ContextCommand {
  constructor() {
    super(new ContextMenuCommandBuilder()
      .setName("Video Info (default)") // @ts-ignore
      .setType(ApplicationCommandType.Message)
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

    if(!targetMsg)
      return int.editReply({
        content: "The targeted message could not be accessed.",
      });

    return await MessageCreateEvt.handleYtLinkMsg(targetMsg, int);
  }
}

//#region c:extended

/** Reply with video info using "everything" as the type */
export class VideoInfoExtendedCtx extends ContextCommand {
  constructor() {
    super(new ContextMenuCommandBuilder()
      .setName("Video Info (extended)") // @ts-ignore
      .setType(ApplicationCommandType.Message)
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

    if(!targetMsg)
      return int.editReply({
        content: "The targeted message could not be accessed.",
      });

    return await MessageCreateEvt.handleYtLinkMsg(targetMsg, int, "everything");
  }
}
