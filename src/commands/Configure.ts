import { ButtonBuilder, ButtonStyle, PermissionFlagsBits, SlashCommandBuilder, type AutocompleteInteraction, type CommandInteraction, type CommandInteractionOption } from "discord.js";
import { EbdColors, useEmbedify } from "@lib/embedify.ts";
import { SlashCommand } from "@lib/SlashCommand.ts";
import { numberFormatChoices, videoInfoTypeChoices } from "@cmd/VideoInfo.ts";
import { em } from "@lib/db.ts";
import { GuildConfig } from "@models/GuildConfig.model.ts";
import localesJson from "@assets/locales.json" with { type: "json" };
import { useButtons } from "@lib/components.ts";
import type { Stringifiable } from "@lib/types.ts";

//#region constants

/** Configuration setting name mapping - value has to adhere to Discord slash command naming rules (lowercase and underscores only!) */
const scNames = {
  defaultVideoInfoType: "default_video_info_type",
  numberFormat: "number_format",
  locale: "locale",
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
  [scNames.numberFormat]: {
    cfgProp: "numberFormat",
    settingName: "number format",
    getValue: (val) => numberFormatChoices.find(c => c.value === val)?.name,
  },
  [scNames.locale]: {
    cfgProp: "locale",
    settingName: "locale",
    validateValue: (val) => localesJson.some(({ locale }) => locale === val),
    invalidHint: "It must be in the format `language-COUNTRY`, like for example `en-US`",
  },
} as const;

//#region constructor

export class Configure extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName("configure")
      .setDescription("View or edit the bot's configuration for your server")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand(option => option
        .setName("reset")
        .setDescription("Reset the configuration to the default settings")
      )
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
        .setName(scNames.numberFormat)
        .setDescription("View or change the format for numbers, for example when displaying likes and dislikes")
        .addStringOption(opt =>
          opt.setName("value")
            .setDescription("The new number format")
            .setChoices(numberFormatChoices)
        )
      )
      .addSubcommand(option => option
        .setName(scNames.locale)
        .setDescription("View or change the locale for the bot, used for formatting dates, numbers and more")
        .addStringOption(opt =>
          opt.setName("value")
            .setDescription("The new locale in the format `language-COUNTRY`, like for example `en-US`")
            .setAutocomplete(true)
            .setMinLength(5)
            .setMaxLength(5)
        )
      )
    );
  }

  //#region run

  async run(int: CommandInteraction, opt: CommandInteractionOption) {
    if(!int.inGuild())
      return int.reply(useEmbedify("This command can only be used in a server", EbdColors.Error));

    const res = await int.deferReply({ ephemeral: true });

    switch(opt.name) {
    // we love doing weird stuff like this
    case (opt.name in configurableOptions ? opt.name : "_"):
      return await Configure.editConfigSetting({
        int,
        opt,
        ...configurableOptions[opt.name as keyof typeof configurableOptions],
      });
    case "reset": {
      const confirmBtns = [
        new ButtonBuilder()
          .setCustomId("confirm-reset-config")
          .setStyle(ButtonStyle.Danger)
          .setLabel("Confirm")
          .setEmoji("🗑️"),
        new ButtonBuilder()
          .setCustomId("cancel-reset-config")
          .setStyle(ButtonStyle.Secondary)
          .setLabel("Cancel")
          .setEmoji("❌"),
      ];

      await int.editReply({
        ...useEmbedify("Are you sure you want to reset the configuration?", EbdColors.Warning),
        ...useButtons([confirmBtns]),
      });

      let conf;

      try {
        conf = await res.awaitMessageComponent({
          filter: ({ user }) => user.id === int.user.id,
          time: 30_000,
        });

        await conf.deferUpdate();

        if(conf.customId === "confirm-reset-config") {
          await em.nativeDelete(GuildConfig.name, { id: int.guildId });
          await em.persistAndFlush(new GuildConfig(int.guildId));
          return conf.editReply({
            ...useEmbedify("Configuration successfully reset to default settings.", EbdColors.Success),
            components: [],
          });
        }
        else {
          await conf.editReply({
            ...useEmbedify("Reset cancelled.", EbdColors.Secondary),
            components: [],
          });
        }
      }
      catch {
        await (conf ?? int).editReply({
          ...useEmbedify("Confirmation not received within 30s, cancelling reset.", EbdColors.Secondary),
          components: [],
        });
      }
    }
    }
  }

  //#region autocomplete

  async autocomplete(int: AutocompleteInteraction) {
    const locales = localesJson
      .filter(({ locale }) => locale.startsWith(int.options.getFocused()))
      .slice(0, 24);

    await int.respond(locales.map(({ locale }) => ({ name: locale, value: locale })));
  }

  //#region utils

  /** Call to edit or view the passed configuration setting */
  public static async editConfigSetting<
    TCfgKey extends keyof GuildConfig,
    TCfgValue extends GuildConfig[TCfgKey],
  >({
    int,
    opt,
    cfgProp,
    settingName,
    getValue = (val) => val,
    validateValue,
    invalidHint,
  }: {
    int: CommandInteraction;
    opt: CommandInteractionOption;
    cfgProp: TCfgKey;
    settingName: string;
    getValue?: (value: TCfgValue) => Stringifiable | undefined;
    validateValue?: (value: TCfgValue) => boolean;
    invalidHint?: string;
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

      if(typeof validateValue === "function" && !validateValue(newValue))
        return int.editReply(useEmbedify(`Invalid ${settingName} specified: \`${newValue}\`${invalidHint ? `\n${invalidHint}` : ""}`, EbdColors.Error));

      cfg[cfgProp] = newValue;
      await em.flush();

      return int.editReply(useEmbedify(`Successfully set the ${settingName} to \`${getValue(newValue) ?? newValue}\``, EbdColors.Success));
    }
    catch(err) {
      return int.editReply(useEmbedify(`Couldn't set the ${settingName} due to an error: ${err}`, EbdColors.Error));
    }
  }
}
