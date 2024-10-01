import { SlashCommandBuilder, type CommandInteraction } from "discord.js";
import { EbdColors, useEmbedify } from "@lib/embedify.ts";
import { getEnvVar } from "@lib/env.ts";
import { SlashCommand } from "@lib/SlashCommand.ts";

//#region constructor

export class Invite extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName("invite")
      .setDescription("Invite YTInfoBot to your own server")
    );
  }

  //#region run

  async run(int: CommandInteraction) {
    return int.reply({
      ...useEmbedify(`You can invite YTInfoBot to your server by [clicking this link.](${getEnvVar("INVITE_URL")})`, EbdColors.Info),
      ephemeral: true,
    });
  }
}
