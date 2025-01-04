import { ContextCommand } from "@lib/Command.ts";
import { useEmbedify } from "@lib/embedify.ts";
import { getLocMap, tr } from "@lib/translate.ts";
import { ApplicationCommandType, ContextMenuCommandBuilder, InteractionContextType, PermissionFlagsBits, type ContextMenuCommandInteraction } from "discord.js";

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
