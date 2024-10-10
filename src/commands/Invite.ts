import { SlashCommandBuilder, type CommandInteraction } from "discord.js";
import { EbdColors, useEmbedify } from "@lib/embedify.ts";
import { getEnvVar } from "@lib/env.ts";
import { CommandBase, SlashCommand } from "@lib/Command.ts";

//#region constructor

export class InviteCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CommandBase.getCmdName("invite"))
      .setDescription("Invite YTInfoBot to your own server")
    );
  }

  //#region pb:run

  public async run(int: CommandInteraction) {
    return int.reply({
      ...useEmbedify(`You can invite YTInfoBot to your server by [clicking this link.](${getEnvVar("BOT_INVITE_URL")})`, EbdColors.Info),
      ephemeral: true,
    });
  }
}
