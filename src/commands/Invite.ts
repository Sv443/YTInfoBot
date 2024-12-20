import { SlashCommandBuilder, type CommandInteraction } from "discord.js";
import { Col, useEmbedify } from "@lib/embedify.ts";
import { getEnvVar } from "@lib/env.ts";
import { CmdBase, SlashCommand } from "@lib/Command.ts";

//#region constructor

export class InviteCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CmdBase.getCmdName("invite"))
      .setDescription("Invite YTInfoBot to your own server")
    );
  }

  //#region pb:run

  public async run(int: CommandInteraction) {
    return int.reply({
      ...useEmbedify(`You can invite YTInfoBot to your server by [clicking this link.](${getEnvVar("BOT_INVITE_URL")})`, Col.Info),
      ephemeral: true,
    });
  }
}
