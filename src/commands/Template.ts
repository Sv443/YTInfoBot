import { SlashCommandBuilder, type CommandInteraction } from "discord.js";
import { useEmbedify } from "@lib/embedify.ts";
import { CmdBase, SlashCommand } from "@lib/Command.ts";
import { getLocMap, tr } from "@lib/translate.ts";

//#region constructor

export class TemplateCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CmdBase.getCmdName(tr.forLang("en-US", "commands.template_command.name")))
      .setNameLocalizations(getLocMap("commands.template_command.name", TemplateCmd.cmdPrefix))
      .setDescription(tr.forLang("en-US", "commands.template_command.description"))
      .setDescriptionLocalizations(getLocMap("commands.template_command.description"))
    );
  }

  //#region pb:run

  public async run(int: CommandInteraction) {
    await int.deferReply({ ephemeral: true });

    const locale = await TemplateCmd.getGuildLocale(int);

    return int.editReply({
      ...useEmbedify(tr.forLang(locale, "TEMPLATE")),
    });
  }
}
