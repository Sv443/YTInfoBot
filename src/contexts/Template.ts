import { ContextCommand } from "@lib/Command.ts";
import { useEmbedify } from "@lib/embedify.ts";
import { ContextMenuCommandBuilder, type ContextMenuCommandInteraction } from "discord.js";

export class ContextTemplateCmd extends ContextCommand {
  constructor() {
    super(new ContextMenuCommandBuilder()
      .setName("Template")
    );
  }

  async run(int: ContextMenuCommandInteraction) {
    return int.reply({
      ...useEmbedify("CONTEXT_TEMPLATE"),
      ephemeral: true,
    });
  }
}
