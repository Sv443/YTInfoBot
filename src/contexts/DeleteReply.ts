import { ContextCommand } from "@lib/Command.js";
import { Col, useEmbedify } from "@lib/embedify.js";
import { getLocMap, tr } from "@lib/translate.js";
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
    await int.deferReply({ ephemeral: true });
    const t = await DeleteReplyCtx.getTrFunc(int);

    try {

      if(!int.isMessageContextMenuCommand())
        return int.editReply(useEmbedify(t("errors.unknown"), Col.Error));

      const { targetMessage: { reference } } = int;

      if(!reference)
        return int.editReply(useEmbedify(t("errors.messageInaccessible"), Col.Error));

      const refMsg = (await int.channel?.messages.fetch({ around: reference.messageId, limit: 1 }))?.at(0);

      if(refMsg?.author.id === int.user.id) {
        try {
          await int.targetMessage.delete();
          return int.editReply(useEmbedify(t("commands.delete_reply_ctx.successMessage"), Col.Success));
        }
        catch {
          return await int.editReply(useEmbedify(t("errors.messageInaccessible"), Col.Error));
        }
      }
      else
        return await int.editReply(useEmbedify(t("errors.notAuthor"), Col.Error));
    }
    catch {
      return await int.editReply(useEmbedify(t("errors.unknown"), Col.Error));
    }
  }
}
