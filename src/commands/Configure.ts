import { PermissionFlagsBits, SlashCommandBuilder, type CommandInteraction, type CommandInteractionOption } from "discord.js";
import { EbdColors, useEmbedify } from "@/lib/embedify.ts";
import { SlashCommand } from "@/lib/SlashCommand.ts";
import { videoInfoTypeChoices } from "@cmd/VideoInfo.ts";
import { em } from "@lib/db.ts";
import { GuildConfig } from "@models/GuildSettings.model.ts";

//#region constants

/** Configuration setting name mapping */
const scNames = {
  defaultVideoInfoType: "default_video_info_type",
} as const satisfies Partial<Record<keyof GuildConfig, string>>;

/** All options that can be configured */
const configurableOptions: Record<
  typeof scNames[keyof typeof scNames],
  Omit<Parameters<typeof Configure.editConfigSetting>[0], "int" | "opt">
> = {
  [scNames.defaultVideoInfoType]: {
    cfgProp: "defaultVideoInfoType",
    settingName: "default video info type",
    getValue: (val) => videoInfoTypeChoices.find(c => c.value === val)?.name,
  },
} as const;

//#region constructor

export class Configure extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName("configure")
      .setDescription("Configure the bot for your server")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand(option => option
        .setName(scNames.defaultVideoInfoType)
        .setDescription("View or change the default video info type, used when a video is sent or no type parameter is given")
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
      return int.reply(useEmbedify("This command can only be used in a server", EbdColors.Error));

    await int.deferReply({ ephemeral: true });

    switch(opt.name) {
    // we love doing weird shit like this
    case (opt.name in configurableOptions ? opt.name : "_"):
      return await Configure.editConfigSetting({
        int,
        opt,
        ...configurableOptions[opt.name as keyof typeof configurableOptions],
      });
    case "reset":
      await em.nativeDelete(GuildConfig.name, { id: int.guildId });
      await em.persistAndFlush(new GuildConfig(int.guildId));
      return int.editReply(useEmbedify("Configuration was reset to default settings.", EbdColors.Warning));
    }
  }

  //#region utils

  /** Call to edit or view the passed configuration setting */
  public static async editConfigSetting<
    TCfgKey extends keyof GuildConfig,
    TCfgValue extends GuildConfig[TCfgKey],
  > ({
    int,
    opt,
    cfgProp,
    settingName,
    getValue,
  }: {
    int: CommandInteraction;
    opt: CommandInteractionOption;
    cfgProp: TCfgKey;
    settingName: string;
    getValue: (value: TCfgValue) => string | { toString(): string } | undefined | null;
  }) {
    try {
      const cfg = await em.findOne(GuildConfig, { id: int.guildId });

      const noConfigFound = () => int.editReply(useEmbedify("No server configuration found - please run `/configure reset`", EbdColors.Error));

      if(!cfg)
        return noConfigFound();

      const newValue = opt.options?.[0]?.value as TCfgValue | undefined;
      if(!newValue) {
        const cfg = await em.findOne(GuildConfig, { id: int.guildId });
        if(!cfg)
          return noConfigFound();
        return int.editReply(useEmbedify(`The current ${settingName} is \`${getValue(cfg[cfgProp] as TCfgValue) ?? cfg[cfgProp]}\``));
      }

      cfg[cfgProp] = newValue;
      await em.flush();

      return int.editReply(useEmbedify(`Successfully set the ${settingName} to \`${getValue(newValue) ?? newValue}\``, EbdColors.Success));
    }
    catch(err) {
      return int.editReply(useEmbedify(`Couldn't set the ${settingName} due to an error: ${err}`, EbdColors.Error));
    }
  }
}
