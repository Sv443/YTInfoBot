import { useEmbedify } from "@utils/embedify.ts";
import { SlashCommand } from "@utils/SlashCommand.ts";
import { SlashCommandBuilder, type CommandInteraction, type CommandInteractionOption } from "discord.js";

export class Configure extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName("configure")
      .setDescription("Configure the bot for your server")
      .addSubcommand(option => option
        .setName("test")
        .setDescription("Testing lol")
      )
    );
  }

  async run(int: CommandInteraction, opt: CommandInteractionOption) {
    if(!int.inGuild())
      return int.reply(useEmbedify("This command can only be used in a server"));

    switch(opt.name) {
    case "test":
      return int.reply(useEmbedify("Test command"));
    }
  }
}
