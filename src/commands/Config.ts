import { ButtonBuilder, ButtonStyle, PermissionFlagsBits, SlashCommandBuilder, type AutocompleteInteraction, type CommandInteraction, type CommandInteractionOption, type SlashCommandSubcommandBuilder } from "discord.js";
import { Col, embedify, useEmbedify } from "@lib/embedify.ts";
import { CmdBase, SlashCommand } from "@lib/Command.ts";
import { numberFormatChoices, videoInfoTypeChoices } from "@cmd/VideoInfo.ts";
import { em } from "@lib/db.ts";
import { GuildConfig } from "@models/GuildConfig.model.ts";
import { useButtons } from "@lib/components.ts";
import { capitalize } from "@lib/text.ts";
import localesJson from "@assets/locales.json" with { type: "json" };
import type { Stringifiable } from "@src/types.ts";
import { registerCommandsForGuild } from "@lib/registry.ts";
import { getLocMap, tr } from "@lib/translate.ts";

//#region constants

/** Configuration setting name mapping - value has to adhere to Discord slash command naming rules (lowercase and underscores only!) */
const getSCNames = () => ({
  defaultVideoInfoType: tr.forLang("en-US", "commands.config.names.subcmd.settings.defaultVideoInfoType"),
  numberFormat: tr.forLang("en-US", "commands.config.names.subcmd.settings.numberFormat"),
  locale: tr.forLang("en-US", "commands.config.names.subcmd.settings.locale"),
  autoReplyEnabled: tr.forLang("en-US", "commands.config.names.subcmd.settings.autoReplyEnabled"),
} as const satisfies Partial<Record<keyof GuildConfig, string>>);

export const getAutoReplyValues = (locale: string) => [
  { name: tr.forLang(locale, "general.enabled"), value: true },
  { name: tr.forLang(locale, "general.disabled"), value: false },
];

/** All options that can be configured */
const getConfigurableOptions = () => {
  const scNames = getSCNames();
  return {
    [scNames.defaultVideoInfoType]: {
      cfgProp: "defaultVideoInfoType",
      settingNameTrKey: "commands.config.names.subcmd.settingNames.defaultVideoInfoType",
      getValueLabel: (val: string | boolean | Date) => videoInfoTypeChoices.find(c => c.value === val)?.name,
      builder: (grpOpt: SlashCommandSubcommandBuilder) => grpOpt
        .setDescription(tr.forLang("en-US", "commands.config.descriptions.settings.defaultVideoInfoType"))
        .setDescriptionLocalizations(getLocMap("commands.config.descriptions.settings.defaultVideoInfoType"))
        .addStringOption(opt =>
          opt.setName(tr.forLang("en-US", "commands.config.names.subcmd.args.newValue"))
            .setNameLocalizations(getLocMap("commands.config.names.subcmd.args.newValue"))
            .setDescription(tr.forLang("en-US", "commands.config.descriptions.args.newValue"))
            .setDescriptionLocalizations(getLocMap("commands.config.descriptions.args.newValue"))
            .setChoices(videoInfoTypeChoices)
            .setRequired(true)
        )
    },
    [scNames.numberFormat]: {
      cfgProp: "numberFormat",
      settingNameTrKey: "commands.config.names.subcmd.settingNames.numberFormat",
      getValueLabel: (val: string | boolean | Date) => numberFormatChoices.find(c => c.value === val)?.name,
      builder: (grpOpt: SlashCommandSubcommandBuilder) => grpOpt
        .setDescription(tr.forLang("en-US", "commands.config.descriptions.settings.numberFormat"))
        .setDescriptionLocalizations(getLocMap("commands.config.descriptions.settings.numberFormat"))
        .addStringOption(opt =>
          opt.setName(tr.forLang("en-US", "commands.config.names.subcmd.args.newValue"))
            .setNameLocalizations(getLocMap("commands.config.names.subcmd.args.newValue"))
            .setDescription(tr.forLang("en-US", "commands.config.descriptions.args.newValue"))
            .setDescriptionLocalizations(getLocMap("commands.config.descriptions.args.newValue"))
            .setChoices(numberFormatChoices)
            .setRequired(true)
        )
    },
    [scNames.locale]: {
      cfgProp: "locale",
      settingNameTrKey: "commands.config.names.subcmd.settingNames.locale",
      getValueLabel: (val: string) => localesJson.find(({ code }) => code === val)?.name,
      validateValue: (val: string) => localesJson.some(({ code }) => code === val),
      invalidHintTrKey: "commands.config.set.localeInvalidHint",
      builder: (grpOpt: SlashCommandSubcommandBuilder) => grpOpt
        .setDescription(tr.forLang("en-US", "commands.config.descriptions.settings.locale"))
        .setDescriptionLocalizations(getLocMap("commands.config.descriptions.settings.locale"))
        .addStringOption(opt =>
          opt.setName(tr.forLang("en-US", "commands.config.names.subcmd.args.newValue"))
            .setNameLocalizations(getLocMap("commands.config.names.subcmd.args.newValue"))
            .setDescription(tr.forLang("en-US", "commands.config.descriptions.args.newValue"))
            .setDescriptionLocalizations(getLocMap("commands.config.descriptions.args.newValue"))
            .setAutocomplete(true)
            .setMinLength(2)
            .setRequired(true)
        )
    },
    [scNames.autoReplyEnabled]: {
      cfgProp: "autoReplyEnabled",
      settingNameTrKey: "commands.config.names.subcmd.settingNames.autoReplyEnabled",
      getValueLabel: (val: string | boolean | Date, loc: string) => getAutoReplyValues(loc).find(c => c.value === Boolean(val))?.name,
      builder: (grpOpt: SlashCommandSubcommandBuilder) => grpOpt
        .setDescription(tr.forLang("en-US", "commands.config.descriptions.settings.autoReplyEnabled"))
        .setDescriptionLocalizations(getLocMap("commands.config.descriptions.settings.autoReplyEnabled"))
        .addBooleanOption(opt =>
          opt.setName(tr.forLang("en-US", "commands.config.names.subcmd.args.newValue"))
            .setNameLocalizations(getLocMap("commands.config.names.subcmd.args.newValue"))
            .setDescription(tr.forLang("en-US", "commands.config.descriptions.args.newValue"))
            .setDescriptionLocalizations(getLocMap("commands.config.descriptions.args.newValue"))
            .setRequired(true)
        )
    },
  } as const satisfies Record<
    ReturnType<typeof getSCNames>[keyof ReturnType<typeof getSCNames>],
    Omit<Parameters<typeof ConfigCmd.editConfigSetting>[0], "int" | "opt"> & {
      builder: (grpOpt: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder;
    }
  >;
};

//#region constructor

export class ConfigCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CmdBase.getCmdName(tr.forLang("en-US", "commands.config.names.command")))
      .setNameLocalizations(getLocMap("commands.config.names.command", ConfigCmd.cmdPrefix))
      .setDescription(tr.forLang("en-US", "commands.config.descriptions.command"))
      .setDescriptionLocalizations(getLocMap("config", ConfigCmd.cmdPrefix))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand(option => option
        .setName(tr.forLang("en-US", "commands.config.names.subcmd.reset"))
        .setNameLocalizations(getLocMap("commands.config.names.subcmd.reset"))
        .setDescription(tr.forLang("en-US", "commands.config.descriptions.subcmd.reset"))
        .setDescriptionLocalizations(getLocMap("commands.config.descriptions.subcmd.reset"))
      )
      .addSubcommand(option => option
        .setName(tr.forLang("en-US", "commands.config.names.subcmd.list"))
        .setNameLocalizations(getLocMap("commands.config.names.subcmd.list"))
        .setDescription(tr.forLang("en-US", "commands.config.descriptions.subcmd.list"))
        .setDescriptionLocalizations(getLocMap("commands.config.descriptions.subcmd.list"))
      )
      .addSubcommandGroup(grpOpt => {
        grpOpt
          .setName(tr.forLang("en-US", "commands.config.names.subcmd.set"))
          .setNameLocalizations(getLocMap("commands.config.names.subcmd.set"))
          .setDescription(tr.forLang("en-US", "commands.config.descriptions.subcmd.set"))
          .setDescriptionLocalizations(getLocMap("commands.config.descriptions.subcmd.set"));

        for(const [name, { builder }] of Object.entries(getConfigurableOptions()))
          grpOpt.addSubcommand(option => builder(option).setName(name));

        return grpOpt;
      })
    );
  }

  //#region pb:run

  public async run(int: CommandInteraction, opt: CommandInteractionOption) {
    if(!ConfigCmd.checkInGuild(int))
      return;

    const reply = await int.deferReply({ ephemeral: true });
    const locale = await ConfigCmd.getGuildLocale(int);

    switch(opt.name) {
    case "set": {
      if(!opt.options?.[0])
        throw new Error("No subcommand received for `/config set` by user " + int.user.id + " in guild " + int.guildId);

      const configurableOptions = getConfigurableOptions();

      await GuildConfig.ensureExists(int.guildId);
      return await ConfigCmd.editConfigSetting({
        int,
        opt,
        ...configurableOptions[opt.options[0].name as keyof typeof configurableOptions],
      });
    }
    case "list": {
      await GuildConfig.ensureExists(int.guildId);
      const cfg = await em.findOne(GuildConfig, { id: int.guildId });

      if(!cfg)
        return await ConfigCmd.noConfigFound(int);

      const cfgList = Object.entries(getConfigurableOptions()).reduce((acc, [, { cfgProp, settingNameTrKey, getValueLabel: getLabel }], i) => {
        const val = getLabel ? getLabel(cfg[cfgProp], locale) : cfg[cfgProp];
        return `${acc}${i !== 0 ? "\n" : ""}- **${capitalize(tr.forLang(locale, settingNameTrKey))}**: \`${val}\``;
      }, "");

      return int.editReply({
        embeds: [
          embedify(cfgList, Col.Info)
            .setTitle(tr.forLang(locale, "commands.config.embedTitles.list"))
        ],
      });
    }
    case "reset": {
      const confirmBtns = [
        new ButtonBuilder()
          .setCustomId("confirm-reset-config")
          .setStyle(ButtonStyle.Danger)
          .setLabel(tr.forLang(locale, "buttons.reset"))
          .setEmoji("♻️"),
        new ButtonBuilder()
          .setCustomId("cancel-reset-config")
          .setStyle(ButtonStyle.Secondary)
          .setLabel(tr.forLang(locale, "buttons.cancel"))
          .setEmoji("❌"),
      ];

      await int.editReply({
        embeds: [
          embedify(`**${tr.forLang(locale, "commands.config.reset.confirm")}**`, Col.Warning)
            .setFooter({ text: tr.forLang(locale, "general.promptExpiryNotice", 30) }),
        ],
        ...useButtons([confirmBtns]),
      });

      let conf;

      try {
        conf = await reply.awaitMessageComponent({
          filter: ({ user }) => user.id === int.user.id,
          time: 30_000,
        });

        await conf.deferUpdate();

        if(conf.customId === "confirm-reset-config") {
          const cfg = await em.findOne(GuildConfig, { id: int.guildId });
          cfg && await em.removeAndFlush(cfg);
          await em.persistAndFlush(new GuildConfig(int.guildId));
          return conf.editReply({
            ...useEmbedify(tr.forLang(locale, "commands.config.reset.success"), Col.Success),
            components: [],
          });
        }
        else {
          await conf.editReply({
            ...useEmbedify(tr.forLang(locale, "commands.config.reset.cancelled"), Col.Secondary),
            components: [],
          });
        }
      }
      catch {
        await (conf ?? int).editReply({
          ...useEmbedify(tr.forLang(locale, "general.confirmationTimeoutNotice", 30), Col.Secondary),
          components: [],
        });
      }
    }
    }
  }

  //#region pb:autocompl.

  public async autocomplete(int: AutocompleteInteraction) {
    const searchVal = int.options.getFocused().toLowerCase().trim();
    const locales = localesJson
      .filter(({ code, name, nativeName }) => code.toLowerCase().includes(searchVal) || name.toLowerCase().includes(searchVal) || nativeName.toLowerCase().includes(searchVal))
      .slice(0, 25);

    await int.respond(locales.map(({ code, name }) => ({ value: code, name })));
  }

  //#region s:utils

  static async noConfigFound(int: CommandInteraction) {
    int[int.deferred || int.replied ? "editReply" : "reply"](useEmbedify(tr.forLang(await ConfigCmd.getGuildLocale(int), "errors.guildCfgInaccessible"), Col.Error));
  }

  /** Call to edit or view the passed configuration setting */
  public static async editConfigSetting<
    TCfgKey extends keyof GuildConfig,
    TCfgValue extends GuildConfig[TCfgKey],
  >({
    int,
    opt,
    cfgProp,
    settingNameTrKey,
    getValueLabel = (val) => val,
    validateValue,
    invalidHintTrKey,
  }: {
    int: CommandInteraction;
    opt: CommandInteractionOption;
    cfgProp: TCfgKey;
    settingNameTrKey: string;
    getValueLabel?: (value: TCfgValue, locale: string) => Stringifiable | undefined;
    validateValue?: (value: TCfgValue) => boolean;
    invalidHintTrKey?: string;
  }) {
    if(!ConfigCmd.checkInGuild(int))
      return;

    if(!int.deferred && !int.replied)
      await int.deferReply({ ephemeral: true });

    const locale = await ConfigCmd.getGuildLocale(int);

    try {
      await GuildConfig.ensureExists(int.guildId);
      const cfg = await em.findOne(GuildConfig, { id: int.guildId });

      if(!cfg)
        return await ConfigCmd.noConfigFound(int);

      // TODO: check if new_value needs to be translated
      const newValue = opt.options?.[0]?.options?.find(o => o.name === "new_value")?.value as TCfgValue | undefined;
      if(typeof newValue === "undefined") {
        const cfg = await em.findOne(GuildConfig, { id: int.guildId });
        if(!cfg)
          return await ConfigCmd.noConfigFound(int);
        return int.editReply(useEmbedify(tr.forLang(locale, "commands.config.set.currentValue", {
          settingName: tr.forLang(locale, settingNameTrKey),
          newValue: getValueLabel(cfg[cfgProp] as TCfgValue, locale) ?? cfg[cfgProp],
        })));
      }

      if(typeof validateValue === "function" && !validateValue(newValue))
        return int.editReply(useEmbedify(tr.forLang(locale, "commands.config.set.invalidValue", {
          settingName: tr.forLang(locale, settingNameTrKey),
          newValue,
          invalidHint: invalidHintTrKey ? `\n${tr.forLang(locale, invalidHintTrKey)}` : "",
        }), Col.Error));

      cfg[cfgProp] = newValue;
      cfg.lastAccessed = new Date();
      await em.flush();

      if(cfgProp === "locale" && !this.global)
        await registerCommandsForGuild(int.guildId);

      return int.editReply(useEmbedify(tr.forLang(locale, "commands.config.set.success", {
        settingName: tr.forLang(locale, settingNameTrKey),
        newValue: getValueLabel(newValue, locale) ?? newValue,
      }), Col.Success));
    }
    catch(err) {
      return int.editReply(useEmbedify(tr.forLang(locale, "commands.config.set.error", {
        settingName: tr.forLang(locale, settingNameTrKey),
        err: err instanceof Error ? err.message : tr.forLang(locale, "errors.unknown"),
      }), Col.Error));
    }
  }
}
