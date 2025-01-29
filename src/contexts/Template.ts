import { ContextCommand } from "@lib/Command.js";
import { useEmbedify } from "@lib/embedify.js";
import { getLocMap, tr } from "@lib/translate.js";
import { ContextMenuCommandBuilder, type ContextMenuCommandInteraction } from "discord.js";

export class TemplateCtx extends ContextCommand {
  constructor() {
    super(new ContextMenuCommandBuilder()
      .setName(tr.for("en-US", "commands.template_ctx.name" as "_"))
      .setNameLocalizations(getLocMap("commands.template_ctx.name" as "_"))
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
