import { useEmbedify } from "@/lib/embedify.ts";
import { SlashCommand } from "@/lib/SlashCommand.ts";
import { videoInfoTypeChoices, type VideoInfoTypeChoiceValues } from "@cmd/VideoInfo.ts";
import { em } from "@lib/db.ts";
import { GuildConfig } from "@models/GuildSettings.model.ts";
import { PermissionFlagsBits, SlashCommandBuilder, type CommandInteraction, type CommandInteractionOption } from "discord.js";

export class Configure extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName("configure")
      .setDescription("Configure the bot for your server")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand(option => option
        .setName("test")
        .setDescription("Testing lol")
      )
      .addSubcommand(option => option
        .setName("default_video_info_type")
        .setDescription("View or change the default video info type")
        .addStringOption(opt =>
          opt.setName("value")
            .setDescription("The new default video info type")
            .setChoices(videoInfoTypeChoices)
        )
      )
      .addSubcommand(option => option
        .setName("reset")
        .setDescription("Reset the configuration to the default settings")
      )
    );
  }

  //#region run

  async run(int: CommandInteraction, opt: CommandInteractionOption) {
    if(!int.inGuild())
      return int.reply(useEmbedify("This command can only be used in a server"));

    await int.deferReply();

    switch(opt.name) {
    case "test":
      return int.editReply(useEmbedify("Test command"));
    case "default_video_info_type": {
      const cfg = await em.findOne(GuildConfig, { id: int.guildId });

      const noConfigFound = () => int.editReply(useEmbedify("No server configuration found - please run `/configure reset`"));

      if(!cfg)
        return noConfigFound();

      const newValue = opt.options?.[0]?.value as VideoInfoTypeChoiceValues | undefined;
      if(!newValue) {
        const cfg = await em.findOne(GuildConfig, { id: int.guildId });
        if(!cfg)
          return noConfigFound();
        return int.editReply(useEmbedify(`Current default video info type is \`${videoInfoTypeChoices.find(c => c.value === cfg.defaultVideoInfoType)?.name ?? cfg.defaultVideoInfoType}\``));
      }

      cfg.defaultVideoInfoType = newValue;
      await em.flush();

      return int.editReply(useEmbedify(`Default video info type set to \`${videoInfoTypeChoices.find(c => c.value === newValue)?.name ?? newValue}\``));
    }
    case "reset": {
      await em.nativeDelete(GuildConfig.name, { id: int.guildId });
      await em.persistAndFlush(new GuildConfig(int.guildId));
      return int.editReply(useEmbedify("Configuration reset to default settings."));
    }
    }
  }
}
