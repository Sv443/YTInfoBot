import { SlashCommandBuilder, type CommandInteraction } from "discord.js";
import { useEmbedify } from "@lib/embedify.ts";
import { SlashCommand } from "@lib/Command.ts";
import { CommandBase } from "@lib/CommandBase.ts";

//#region constructor

export class TemplateCommand extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CommandBase.getCmdName("template_command"))
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
