import { SlashCommandBuilder, type CommandInteraction } from "discord.js";
import { useEmbedify } from "@lib/embedify.ts";
import { CmdBase, SlashCommand } from "@lib/Command.ts";
import { getLocMap, tr } from "@lib/translate.ts";

//#region constructor

export class TemplateCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CmdBase.getCmdName(tr.forLang("en-US", "commands.template_command.name" as "_")))
      .setNameLocalizations(getLocMap("commands.template_command.name" as "_", TemplateCmd.cmdPrefix))
      .setDescription(tr.forLang("en-US", "commands.template_command.description" as "_"))
      .setDescriptionLocalizations(getLocMap("commands.template_command.description" as "_"))
    );
  }

  //#region pb:run

  public async run(int: CommandInteraction) {
    await int.deferReply({ ephemeral: true });

    const locale = await TemplateCmd.getGuildLocale(int);

    return int.editReply({
      ...useEmbedify(tr.forLang(locale, "commands.template_command.embedContent" as "_")),
    });
  }
}
