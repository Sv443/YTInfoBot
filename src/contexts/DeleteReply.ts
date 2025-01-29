import { ContextCommand } from "@lib/Command.js";
import { useEmbedify } from "@lib/embedify.js";
import { getLocMap, tr } from "@lib/translate.js";
import { ApplicationCommandType, ContextMenuCommandBuilder, InteractionContextType, PermissionFlagsBits, type ContextMenuCommandInteraction } from "discord.js";

//TODO:

export class DeleteReplyCtx extends ContextCommand {
  constructor() {
    super(new ContextMenuCommandBuilder()
      .setName(tr.for("en-US", "commands.delete_reply_ctx.name"))
      .setNameLocalizations(getLocMap("commands.delete_reply_ctx.name"))
      .setType(ApplicationCommandType.Message as number)
      .setContexts(InteractionContextType.Guild, InteractionContextType.PrivateChannel)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    );
  }

  //#region pb:run

  public async run(int: ContextMenuCommandInteraction) {
    return int.reply({
      ...useEmbedify("CONTEXT_TEMPLATE"),
      ephemeral: true,
    });
  }
}
