import { ButtonBuilder, ButtonStyle, PermissionFlagsBits, SlashCommandBuilder, type AutocompleteInteraction, type CommandInteraction, type CommandInteractionOption, type SlashCommandSubcommandBuilder } from "discord.js";
import { EbdColors, embedify, useEmbedify } from "@lib/embedify.ts";
import { CommandBase, SlashCommand } from "@lib/SlashCommand.ts";
import { numberFormatChoices, videoInfoTypeChoices } from "@cmd/VideoInfo.ts";
import { em } from "@lib/db.ts";
import { GuildConfig } from "@models/GuildConfig.model.ts";
import { useButtons } from "@lib/components.ts";
import { capitalize } from "@lib/text.ts";
import localesJson from "@assets/locales.json" with { type: "json" };
import type { Stringifiable } from "@/types.ts";

//#region constants

/** Configuration setting name mapping - value has to adhere to Discord slash command naming rules (lowercase and underscores only!) */
const scNames = {
  defaultVideoInfoType: "default_video_info_type",
  numberFormat: "number_format",
  locale: "locale",
  autoReplyEnabled: "auto_reply",
} as const satisfies Partial<Record<keyof GuildConfig, string>>;

export const autoReplyValues = [
  { name: "Enabled", value: true },
  { name: "Disabled", value: false },
];

/** All options that can be configured */
const configurableOptions: Record<
  typeof scNames[keyof typeof scNames],
  Omit<Parameters<typeof ConfigCmd.editConfigSetting>[0], "int" | "opt"> & {
    builder: (grpOpt: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder;
  }
> = {
  [scNames.defaultVideoInfoType]: {
    cfgProp: "defaultVideoInfoType",
    settingName: "default video info type",
    getValueLabel: (val) => videoInfoTypeChoices.find(c => c.value === val)?.name,
    builder: (grpOpt: SlashCommandSubcommandBuilder) => grpOpt
      .setDescription("View or change the default video_info type, used when a link is sent or no type argument is given")
      .addStringOption(opt =>
        opt.setName("new_value")
          .setDescription("The new default video_info type")
          .setChoices(videoInfoTypeChoices)
          .setRequired(true)
      )
  },
  [scNames.numberFormat]: {
    cfgProp: "numberFormat",
    settingName: "number format",
    getValueLabel: (val) => numberFormatChoices.find(c => c.value === val)?.name,
    builder: (grpOpt: SlashCommandSubcommandBuilder) => grpOpt
      .setDescription("View or change number format for this server, for example when displaying likes and dislikes")
      .addStringOption(opt =>
        opt.setName("new_value")
          .setDescription("The new number format")
          .setChoices(numberFormatChoices)
          .setRequired(true)
      )
  },
  [scNames.locale]: {
    cfgProp: "locale",
    settingName: "locale",
    getValueLabel: (val) => localesJson.find(({ code }) => code === val)?.name,
    validateValue: (val) => localesJson.some(({ code }) => code === val),
    invalidHint: "It must be in the format `language-COUNTRY` (case sensitive), like `en-US`.\nAlso, not all locales are supported - look up `BCP 47` for more info.",
    builder: (grpOpt: SlashCommandSubcommandBuilder) => grpOpt
      .setDescription("View or change the locale for the server, used for formatting dates, numbers and more")
      .addStringOption(opt =>
        opt.setName("new_value")
          .setDescription("The new locale")
          .setAutocomplete(true)
          .setMinLength(5)
          .setMaxLength(5)
          .setRequired(true)
      )
  },
  [scNames.autoReplyEnabled]: {
    cfgProp: "autoReplyEnabled",
    settingName: "auto reply state",
    getValueLabel: (val) => autoReplyValues.find(c => c.value === Boolean(val))?.name,
    builder: (grpOpt: SlashCommandSubcommandBuilder) => grpOpt
      .setDescription("Change whether the bot will automatically reply to all messages containing a video link")
      .addBooleanOption(opt =>
        opt.setName("new_value")
          .setDescription("Whether auto-reply should be enabled")
          .setRequired(true)
      )
  },
} as const;

//#region constructor

export class ConfigCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CommandBase.getCmdName("config"))
      .setDescription("View or edit the bot configuration for your server")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand(option => option
        .setName("reset")
        .setDescription("Reset the configuration to the default settings")
      )
      .addSubcommand(option => option
        .setName("list")
        .setDescription("List all configurable settings and their current values")
      )
      .addSubcommandGroup(grpOpt => {
        grpOpt
          .setName("set")
          .setDescription("Set a specific setting to a new value");

        for(const [name, { builder }] of Object.entries(configurableOptions))
          grpOpt.addSubcommand(option => builder(option).setName(name));

        return grpOpt;
      })
    );
  }

  //#region run

  async run(int: CommandInteraction, opt: CommandInteractionOption) {
    if(!int.inGuild())
      return int.reply(useEmbedify("This command can only be used in a server", EbdColors.Error));

    const reply = await int.deferReply({ ephemeral: true });

    switch(opt.name) {
    case "set":
      if(!opt.options?.[0])
        throw new Error("No subcommand provided in /config set");

      return await ConfigCmd.editConfigSetting({
        int,
        opt,
        ...configurableOptions[opt.options[0].name as keyof typeof configurableOptions],
      });
    case "list": {
      const cfg = await em.findOne(GuildConfig, { id: int.guildId });

      if(!cfg)
        return ConfigCmd.noConfigFound(int);

      const cfgList = Object.entries(configurableOptions).reduce((acc, [, { cfgProp, settingName, getValueLabel: getLabel }], i) => {
        const val = getLabel ? getLabel(cfg[cfgProp]) : cfg[cfgProp];
        return `${acc}${i !== 0 ? "\n" : ""}- **${capitalize(settingName)}**: \`${val}\``;
      }, "");

      return int.editReply({
        embeds: [
          embedify(cfgList, EbdColors.Info)
            .setTitle("Server configuration values:")
        ],
      });
    }
    case "reset": {
      const confirmBtns = [
        new ButtonBuilder()
          .setCustomId("confirm-reset-config")
          .setStyle(ButtonStyle.Danger)
          .setLabel("Reset")
          .setEmoji("♻️"),
        new ButtonBuilder()
          .setCustomId("cancel-reset-config")
          .setStyle(ButtonStyle.Secondary)
          .setLabel("Cancel")
          .setEmoji("❌"),
      ];

      await int.editReply({
        embeds: [
          embedify("**Are you sure you want to reset the configuration?**", EbdColors.Warning)
            .setFooter({ text: "This prompt will expire in 60s" }),
        ],
        ...useButtons([confirmBtns]),
      });

      let conf;

      try {
        conf = await reply.awaitMessageComponent({
          filter: ({ user }) => user.id === int.user.id,
          time: 60_000,
        });

        await conf.deferUpdate();

        if(conf.customId === "confirm-reset-config") {
          const cfg = await em.findOne(GuildConfig, { id: int.guildId });
          cfg && await em.removeAndFlush(cfg);
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
    const searchVal = int.options.getFocused().toLowerCase();
    const locales = localesJson
      .filter(({ code, name }) => code.toLowerCase().includes(searchVal) || name.toLowerCase().includes(searchVal))
      .slice(0, 25);

    await int.respond(locales.map(({ code, name }) => ({ value: code, name })));
  }

  //#region utils

  static noConfigFound(int: CommandInteraction) {
    int[int.deferred || int.replied ? "editReply" : "reply"](useEmbedify("No server configuration found - please run `/config reset`", EbdColors.Error));
  }

  /** Call to edit or view the passed configuration setting */
  public static async editConfigSetting<
    TCfgKey extends keyof GuildConfig,
    TCfgValue extends GuildConfig[TCfgKey],
  >({
    int,
    opt,
    cfgProp,
    settingName,
    getValueLabel = (val) => val,
    validateValue,
    invalidHint,
  }: {
    int: CommandInteraction;
    opt: CommandInteractionOption;
    cfgProp: TCfgKey;
    settingName: string;
    getValueLabel?: (value: TCfgValue) => Stringifiable | undefined;
    validateValue?: (value: TCfgValue) => boolean;
    invalidHint?: string;
  }) {
    try {
      const cfg = await em.findOne(GuildConfig, { id: int.guildId });

      if(!cfg)
        return ConfigCmd.noConfigFound(int);

      const newValue = opt.options?.[0]?.options?.find(o => o.name === "new_value")?.value as TCfgValue | undefined;
      if(typeof newValue === "undefined") {
        const cfg = await em.findOne(GuildConfig, { id: int.guildId });
        if(!cfg)
          return ConfigCmd.noConfigFound(int);
        return int.editReply(useEmbedify(`The current ${settingName} is \`${getValueLabel(cfg[cfgProp] as TCfgValue) ?? cfg[cfgProp]}\``));
      }

      if(typeof validateValue === "function" && !validateValue(newValue))
        return int.editReply(useEmbedify(`Invalid ${settingName} specified: \`${newValue}\`${invalidHint ? `\n${invalidHint}` : ""}`, EbdColors.Error));

      cfg[cfgProp] = newValue;
      await em.flush();

      return int.editReply(useEmbedify(`Successfully set the ${settingName} to \`${getValueLabel(newValue) ?? newValue}\``, EbdColors.Success));
    }
    catch(err) {
      return int.editReply(useEmbedify(`Couldn't set the ${settingName} due to an error: ${err}`, EbdColors.Error));
    }
  }
}
