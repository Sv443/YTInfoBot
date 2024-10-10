import { ContextCommand } from "@lib/Command.ts";
import { useEmbedify } from "@lib/embedify.ts";
import { ContextMenuCommandBuilder, type ContextMenuCommandInteraction } from "discord.js";

export class TemplateCtx extends ContextCommand {
  constructor() {
    super(new ContextMenuCommandBuilder()
      .setName("Template")
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
