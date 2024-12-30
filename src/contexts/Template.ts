import { ContextCommand } from "@lib/Command.ts";
import { useEmbedify } from "@lib/embedify.ts";
import { getLocMap, tr } from "@lib/translate.ts";
import { ContextMenuCommandBuilder, type ContextMenuCommandInteraction } from "discord.js";

export class TemplateCtx extends ContextCommand {
  constructor() {
    super(new ContextMenuCommandBuilder()
      .setName(tr.forLang("en-US", "commands.template_ctx.name"))
      .setNameLocalizations(getLocMap("commands.template_ctx.name"))
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
