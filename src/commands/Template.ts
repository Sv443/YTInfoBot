import { SlashCommandBuilder, type CommandInteraction } from "discord.js";
import { useEmbedify } from "@lib/embedify.ts";
import { SlashCommand } from "@lib/SlashCommand.ts";

//#region constructor

export class TemplateCommand extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName("template_command")
      .setDescription("TEMPLATE_COMMAND")
    );
  }

  //#region run

  async run(int: CommandInteraction) {
    return int.reply({
      ...useEmbedify("TEMPLATE"),
      ephemeral: true,
    });
  }
}
