import { SlashCommandBuilder, type CommandInteraction } from "discord.js";
import { useEmbedify } from "@lib/embedify.ts";
import { CmdBase, SlashCommand } from "@lib/Command.ts";

//#region constructor

export class TemplateCommand extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CmdBase.getCmdName("template_command"))
      .setDescription("TEMPLATE_COMMAND")
    );
  }

  //#region pb:run

  public async run(int: CommandInteraction) {
    return int.reply({
      ...useEmbedify("TEMPLATE"),
      ephemeral: true,
    });
  }
}
