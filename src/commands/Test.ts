import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, type CommandInteraction } from "discord.js";
import { SlashCommand } from "@lib/Command.ts";

//#region constructor

export class TestCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName("test")
      .setDescription("Test command")
    );
  }

  //#region pb:run

  public async run(int: CommandInteraction) {
    return int.reply({
      content: "TEST COMMAND",
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setStyle(ButtonStyle.Primary).setLabel("Primary"),
          new ButtonBuilder().setStyle(ButtonStyle.Premium).setLabel("Premium"),
          new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel("Secondary"),
        ).toJSON()
      ],
    });
  }
}
