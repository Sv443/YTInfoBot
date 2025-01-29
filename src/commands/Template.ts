import { SlashCommandBuilder, type CommandInteraction } from "discord.js";
import { useEmbedify } from "@lib/embedify.js";
import { CmdBase, SlashCommand } from "@lib/Command.js";
import { getLocMap, tr } from "@lib/translate.js";

//#region constructor

export class TemplateCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CmdBase.getCmdName(tr.for("en-US", "commands.template_command.name" as "_")))
      .setNameLocalizations(getLocMap("commands.template_command.name" as "_", TemplateCmd.cmdPrefix))
      .setDescription(tr.for("en-US", "commands.template_command.description" as "_"))
      .setDescriptionLocalizations(getLocMap("commands.template_command.description" as "_"))
    );
  }

  //#region pb:run

  public async run(int: CommandInteraction) {
    await int.deferReply({ ephemeral: true });

    const t = await TemplateCmd.getTrFunc(int);

    return int.editReply({
      ...useEmbedify(t("commands.template_command.embedContent" as "_")),
    });
  }
}
