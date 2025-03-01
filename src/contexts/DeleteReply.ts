import { ApplicationCommandType, ContextMenuCommandBuilder, InteractionContextType, PermissionFlagsBits, type ContextMenuCommandInteraction } from "discord.js";
import { client } from "@lib/client.js";
import { ContextCommand } from "@lib/Command.js";
import { Col, useEmbedify } from "@lib/embedify.js";
import { getLocMap, tr } from "@lib/translate.js";
import { getMsgLink } from "@lib/misc.js";

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

      const { targetMessage } = int;

      if(!targetMessage.reference || targetMessage.author.id !== client.user?.id)
        return int.editReply(useEmbedify(t("commands.delete_reply_ctx.wrongMessageError"), Col.Error));

      const refMsg = (await int.channel?.messages.fetch({ around: targetMessage.reference.messageId, limit: 1 }))?.first();

      // allow only author of message that was replied to or user with ManageMessages permission to delete the message
      if(refMsg && (refMsg.author.id === int.user.id || int.memberPermissions?.has(PermissionFlagsBits.ManageMessages))) {
        try {
          await int.targetMessage.delete();
          return int.editReply(useEmbedify(t("commands.delete_reply_ctx.success", { msgLink: getMsgLink(refMsg!) }), Col.Success));
        }
        catch {
          return await int.editReply(useEmbedify(t("commands.delete_reply_ctx.wrongMessageError"), Col.Error));
        }
      }
      else
        return await int.editReply(useEmbedify(t("commands.delete_reply_ctx.wrongMessageError"), Col.Error));
    }
    catch {
      return await int.editReply(useEmbedify(t("errors.unknown"), Col.Error));
    }
  }
}
