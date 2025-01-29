import { SlashCommandBuilder, type CommandInteraction } from "discord.js";
import { Col, useEmbedify } from "@lib/embedify.js";
import { getEnvVar } from "@lib/env.js";
import { CmdBase, SlashCommand } from "@lib/Command.js";
import { getLocMap, tr } from "@lib/translate.js";

//#region constructor

export class InviteCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CmdBase.getCmdName(tr.for("en-US", "commands.invite.names.command")))
      .setNameLocalizations(getLocMap("commands.invite.names.command", InviteCmd.cmdPrefix))
      .setDescription(tr.for("en-US", "commands.invite.description"))
      .setDescriptionLocalizations(getLocMap("commands.invite.description"))
    );
  }

  //#region pb:run

  public async run(int: CommandInteraction) {
    await int.deferReply({ ephemeral: true });

    const locale = await InviteCmd.getGuildLocale(int);

    return int.editReply(useEmbedify(tr.for(locale, "commands.invite.embedContent", getEnvVar("BOT_INVITE_URL")), Col.Info));
  }
}
