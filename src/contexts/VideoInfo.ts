import { MessageCreateEvt } from "@evt/MessageCreate.ts";
import { ContextCommand } from "@lib/Command.ts";
import { ApplicationCommandType, ContextMenuCommandBuilder, InteractionContextType, type ContextMenuCommandInteraction } from "discord.js";

export class VideoInfoCtx extends ContextCommand {
  constructor() {
    super(new ContextMenuCommandBuilder()
      .setName("Video Info") // @ts-ignore
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

    return await MessageCreateEvt.handleYtVideoMsg(targetMsg, int);
  }
}
