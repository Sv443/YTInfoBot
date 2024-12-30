import { SlashCommandBuilder, type CommandInteraction } from "discord.js";
import { Col, useEmbedify } from "@lib/embedify.ts";
import { getEnvVar } from "@lib/env.ts";
import { CmdBase, SlashCommand } from "@lib/Command.ts";
import { getLocMap, tr } from "@lib/translate.ts";

//#region constructor

export class InviteCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CmdBase.getCmdName("invite"))
      .setDescription(tr.forLang("en-US", "commands.invite.description"))
      .setDescriptionLocalizations(getLocMap("commands.invite.description"))
    );
  }

  //#region pb:run

  public async run(int: CommandInteraction) {
    return int.reply({
      ...useEmbedify(tr("commands.invite.embedContent", getEnvVar("BOT_INVITE_URL")), Col.Info),
      ephemeral: true,
    });
  }
}
