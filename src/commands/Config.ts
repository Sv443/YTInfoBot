import { ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits, SlashCommandBuilder, type AutocompleteInteraction, type CommandInteraction, type CommandInteractionOption, type SlashCommandSubcommandBuilder } from "discord.js";
import { Col, useEmbedify } from "@lib/embedify.js";
import { CmdBase, SlashCommand } from "@lib/Command.js";
import { getNumberFormatChoices, getNumberFormatLabel, getVideoInfoTypeChoices, getVideoInfoTypeLabel } from "@cmd/VideoInfo.js";
import { discardEntity, em, resetEntity } from "@lib/db.js";
import { GuildConfig, isValidLinksPerReplyLimit, linksPerReplyLimitMax, linksPerReplyLimitMin } from "@models/GuildConfig.model.js";
import { useButtons } from "@lib/components.js";
import { capitalize } from "@lib/text.js";
import { registerCommandsForGuild } from "@lib/registry.js";
import { getLocMap, getRegisteredTranslations, tr, type TrKeyEn } from "@lib/translate.js";
import { getEnvVar } from "@lib/env.js";
import type { Stringifiable } from "@src/types.js";
import localesJson from "@assets/locales.json" with { type: "json" };
import k from "kleur";

//#region constants

let localesReformatted: { value: string; name: string; loc: typeof localesJson[0] }[];

const getLocalesReformatted = () => {
  if(!localesReformatted)
    localesReformatted = [...localesJson]
      .sort((a, b) => a.nativeName.localeCompare(b.nativeName))
      .map((loc) => ({
        value: loc.code,
        name: `${loc.emoji} ${/\(.+\)/.test(loc.name)
          ? loc.name
          : `${loc.name} (${loc.nativeName})`
        } ${getRegisteredTranslations().has(loc.code) ? "✅" : "⚠️"}`,
        loc,
      }));
  return localesReformatted;
};

/** Configuration setting name mapping - value has to adhere to Discord slash command naming rules (lowercase and underscores only!) */
const getSCNames = () => ({
  defaultVideoInfoType: tr.for("en-US", "commands.config.names.subcmd.settings.defaultVideoInfoType"),
  numberFormat: tr.for("en-US", "commands.config.names.subcmd.settings.numberFormat"),
  locale: tr.for("en-US", "commands.config.names.subcmd.settings.locale"),
  autoReplyEnabled: tr.for("en-US", "commands.config.names.subcmd.settings.autoReplyEnabled"),
  linksPerReplyLimit: tr.for("en-US", "commands.config.names.subcmd.settings.linksPerReplyLimit"),
} as const satisfies Partial<Record<keyof GuildConfig, string>>);

export const getAutoReplyValues = (locale: string) => [
  { name: tr.for(locale, "general.enabled"), value: true },
  { name: tr.for(locale, "general.disabled"), value: false },
];

/** All options that can be configured */
const getConfigurableOptions = () => {
  const scNames = getSCNames();
  return {
    [scNames.defaultVideoInfoType]: {
      cfgProp: "defaultVideoInfoType",
      settingNameTrKey: "commands.config.names.subcmd.settingNames.defaultVideoInfoType",
      getValueLabel: (val: unknown, loc: string) => getVideoInfoTypeLabel(val, loc),
      builder: (grpOpt: SlashCommandSubcommandBuilder) => grpOpt
        .setNameLocalizations(getLocMap("commands.config.names.subcmd.settings.defaultVideoInfoType"))
        .setDescription(tr.for("en-US", "commands.config.descriptions.settings.defaultVideoInfoType"))
        .setDescriptionLocalizations(getLocMap("commands.config.descriptions.settings.defaultVideoInfoType"))
        .addStringOption(opt =>
          opt.setName(tr.for("en-US", "commands.config.names.subcmd.args.newValue"))
            .setNameLocalizations(getLocMap("commands.config.names.subcmd.args.newValue"))
            .setDescription(tr.for("en-US", "commands.config.descriptions.args.newValue"))
            .setDescriptionLocalizations(getLocMap("commands.config.descriptions.args.newValue"))
            .setChoices(getVideoInfoTypeChoices())
            .setRequired(true)
        )
    },
    [scNames.numberFormat]: {
      cfgProp: "numberFormat",
      settingNameTrKey: "commands.config.names.subcmd.settingNames.numberFormat",
      getValueLabel: (val: unknown, loc: string) => getNumberFormatLabel(val, loc),
      builder: (grpOpt: SlashCommandSubcommandBuilder) => grpOpt
        .setNameLocalizations(getLocMap("commands.config.names.subcmd.settings.numberFormat"))
        .setDescription(tr.for("en-US", "commands.config.descriptions.settings.numberFormat"))
        .setDescriptionLocalizations(getLocMap("commands.config.descriptions.settings.numberFormat"))
        .addStringOption(opt =>
          opt.setName(tr.for("en-US", "commands.config.names.subcmd.args.newValue"))
            .setNameLocalizations(getLocMap("commands.config.names.subcmd.args.newValue"))
            .setDescription(tr.for("en-US", "commands.config.descriptions.args.newValue"))
            .setDescriptionLocalizations(getLocMap("commands.config.descriptions.args.newValue"))
            .setChoices(getNumberFormatChoices())
            .setRequired(true)
        )
    },
    [scNames.locale]: {
      cfgProp: "locale",
      settingNameTrKey: "commands.config.names.subcmd.settingNames.locale",
      getValueLabel: (val: unknown) => localesJson.find(({ code }) => code === val)?.name,
      validateValue: (val: unknown) => localesJson.some(({ code }) => code === val),
      invalidHintTrKey: "commands.config.set.localeInvalidHint",
      builder: (grpOpt: SlashCommandSubcommandBuilder) => grpOpt
        .setNameLocalizations(getLocMap("commands.config.names.subcmd.settings.locale"))
        .setDescription(tr.for("en-US", "commands.config.descriptions.settings.locale"))
        .setDescriptionLocalizations(getLocMap("commands.config.descriptions.settings.locale"))
        .addStringOption(opt =>
          opt.setName(tr.for("en-US", "commands.config.names.subcmd.args.newValue"))
            .setNameLocalizations(getLocMap("commands.config.names.subcmd.args.newValue"))
            .setDescription(tr.for("en-US", "commands.config.descriptions.args.newValue"))
            .setDescriptionLocalizations(getLocMap("commands.config.descriptions.args.newValue"))
            .setAutocomplete(true)
            .setMinLength(2)
            .setRequired(true)
        )
    },
    [scNames.autoReplyEnabled]: {
      cfgProp: "autoReplyEnabled",
      settingNameTrKey: "commands.config.names.subcmd.settingNames.autoReplyEnabled",
      getValueLabel: (val: unknown, loc: string) => getAutoReplyValues(loc).find(c => c.value === Boolean(val))?.name,
      builder: (grpOpt: SlashCommandSubcommandBuilder) => grpOpt
        .setNameLocalizations(getLocMap("commands.config.names.subcmd.settings.autoReplyEnabled"))
        .setDescription(tr.for("en-US", "commands.config.descriptions.settings.autoReplyEnabled"))
        .setDescriptionLocalizations(getLocMap("commands.config.descriptions.settings.autoReplyEnabled"))
        .addBooleanOption(opt =>
          opt.setName(tr.for("en-US", "commands.config.names.subcmd.args.newValue"))
            .setNameLocalizations(getLocMap("commands.config.names.subcmd.args.newValue"))
            .setDescription(tr.for("en-US", "commands.config.descriptions.args.newValue"))
            .setDescriptionLocalizations(getLocMap("commands.config.descriptions.args.newValue"))
            .setRequired(true)
        )
    },
    [scNames.linksPerReplyLimit]: {
      cfgProp: "linksPerReplyLimit",
      settingNameTrKey: "commands.config.names.subcmd.settingNames.linksPerReplyLimit",
      getValueLabel: (val: unknown) => String(val),
      validateValue: (val: unknown) => isValidLinksPerReplyLimit(val),
      invalidHintTrKey: "commands.config.set.linksPerReplyLimitInvalidHint",
      invalidHintArgs: { min: linksPerReplyLimitMin, max: linksPerReplyLimitMax },
      builder: (grpOpt: SlashCommandSubcommandBuilder) => grpOpt
        .setNameLocalizations(getLocMap("commands.config.names.subcmd.settings.linksPerReplyLimit"))
        .setDescription(tr.for("en-US", "commands.config.descriptions.settings.linksPerReplyLimit"))
        .setDescriptionLocalizations(getLocMap("commands.config.descriptions.settings.linksPerReplyLimit"))
        .addIntegerOption(opt =>
          opt.setName(tr.for("en-US", "commands.config.names.subcmd.args.newValue"))
            .setNameLocalizations(getLocMap("commands.config.names.subcmd.args.newValue"))
            .setDescription(tr.for("en-US", "commands.config.descriptions.args.newValue"))
            .setDescriptionLocalizations(getLocMap("commands.config.descriptions.args.newValue"))
            .setMinValue(linksPerReplyLimitMin)
            .setMaxValue(linksPerReplyLimitMax)
            .setRequired(true)
        )
    }
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
      .setName(CmdBase.getCmdName(tr.for("en-US", "commands.config.names.command")))
      .setNameLocalizations(getLocMap("commands.config.names.command", ConfigCmd.cmdPrefix))
      .setDescription(tr.for("en-US", "commands.config.descriptions.command"))
      .setDescriptionLocalizations(getLocMap("commands.config.descriptions.command", ConfigCmd.cmdPrefix))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand(option => option
        .setName(tr.for("en-US", "commands.config.names.subcmd.reset"))
        .setNameLocalizations(getLocMap("commands.config.names.subcmd.reset"))
        .setDescription(tr.for("en-US", "commands.config.descriptions.subcmd.reset"))
        .setDescriptionLocalizations(getLocMap("commands.config.descriptions.subcmd.reset"))
      )
      .addSubcommand(option => option
        .setName(tr.for("en-US", "commands.config.names.subcmd.list"))
        .setNameLocalizations(getLocMap("commands.config.names.subcmd.list"))
        .setDescription(tr.for("en-US", "commands.config.descriptions.subcmd.list"))
        .setDescriptionLocalizations(getLocMap("commands.config.descriptions.subcmd.list"))
      )
      .addSubcommandGroup(grpOpt => {
        grpOpt
          .setName(tr.for("en-US", "commands.config.names.subcmd.set"))
          .setNameLocalizations(getLocMap("commands.config.names.subcmd.set"))
          .setDescription(tr.for("en-US", "commands.config.descriptions.subcmd.set"))
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

    const reply = await int.deferReply({ flags: [MessageFlags.Ephemeral] });
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
        const val = getLabel ? getLabel(String(cfg[cfgProp]), locale) : cfg[cfgProp];
        return `${acc}${i !== 0 ? "\n" : ""}- **${capitalize(tr.for(locale, settingNameTrKey))}**: \`${val}\``;
      }, "");

      return int.editReply(useEmbedify(cfgList, Col.Info, (e) => e
        .setTitle(tr.for(locale, "commands.config.listEmbed.title"))
        .setFooter({ text: tr.for(locale, "commands.config.listEmbed.footer") })
      ));
    }
    case "reset": {
      const confirmBtns = [
        new ButtonBuilder()
          .setCustomId("confirm-reset-config")
          .setStyle(ButtonStyle.Danger)
          .setLabel(tr.for(locale, "buttons.reset"))
          .setEmoji("♻️"),
        new ButtonBuilder()
          .setCustomId("cancel-reset-config")
          .setStyle(ButtonStyle.Secondary)
          .setLabel(tr.for(locale, "buttons.cancel"))
          .setEmoji("❌"),
      ];

      await int.editReply({
        ...useEmbedify(`**${tr.for(locale, "commands.config.reset.confirm")}**`, Col.Warning, (e) => e.setFooter({ text: tr.for(locale, "general.promptExpiryNotice", 30) })),
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
          await resetEntity(GuildConfig, int.guildId);
          return conf.editReply({
            ...useEmbedify(tr.for(locale, "commands.config.reset.success"), Col.Success),
            components: [],
          });
        }
        else {
          await conf.editReply({
            ...useEmbedify(tr.for(locale, "commands.config.reset.cancelled"), Col.Secondary),
            components: [],
          });
        }
      }
      catch(err) {
        console.error(k.red("Error while sending confirmation for `/config reset`:"), err);
        await (conf ?? int).editReply({
          ...useEmbedify(tr.for(locale, "general.confirmationTimeoutNotice", 30), Col.Secondary),
          components: [],
        });
      }
    }
    }
  }

  //#region pb:autocompl.

  public async autocomplete(int: AutocompleteInteraction) {
    const searchVal = int.options.getFocused().toLowerCase().trim();
    const maxAcRes = getEnvVar("MAX_AUTOCOMPLETE_RESULTS", "number");
    // an unset or empty env var is cast to 0 by getEnvVar(), which would result in an always-empty response:
    const acResAmt = !Number.isFinite(maxAcRes) || maxAcRes < 1 ? 25 : Math.min(Math.floor(maxAcRes), 25);

    switch(int.options.getSubcommand(true)) {
    case "locale": {
      const res = getLocalesReformatted()
        .filter(({ loc: { code, name, nativeName } }) =>
          code.toLowerCase().includes(searchVal)
          || name.toLowerCase().includes(searchVal)
          || nativeName.toLowerCase().includes(searchVal)
        )
        .slice(0, acResAmt)
        .map(({ name, value }) => ({ name, value }));

      try {
        await int.respond(res);
      }
      catch(err) {
        console.error(k.red("Error while sending autocomplete response for `/config set locale`:"), err);
      }
    }
    }
  }

  //#region s:utils

  static async noConfigFound(int: CommandInteraction) {
    int[int.deferred || int.replied ? "editReply" : "reply"](useEmbedify(tr.for(await ConfigCmd.getGuildLocale(int), "errors.guildCfgInaccessible"), Col.Error));
  }

  //#region s:editCfgSett

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
    invalidHintArgs,
  }: {
    int: CommandInteraction;
    opt: CommandInteractionOption;
    cfgProp: TCfgKey;
    settingNameTrKey: TrKeyEn;
    getValueLabel?: (value: TCfgValue, locale: string) => Stringifiable | undefined;
    validateValue?: (value: TCfgValue) => boolean;
    invalidHintTrKey?: TrKeyEn;
    /** Placeholder values for the invalid hint translation */
    invalidHintArgs?: Record<string, Stringifiable>;
  }) {
    if(!ConfigCmd.checkInGuild(int))
      return;

    if(!int.deferred && !int.replied)
      await int.deferReply({ flags: [MessageFlags.Ephemeral] });

    const locale = await ConfigCmd.getGuildLocale(int);

    let cfg: GuildConfig | null = null;

    try {
      await GuildConfig.ensureExists(int.guildId);
      cfg = await em.findOne(GuildConfig, { id: int.guildId });

      if(!cfg)
        return await ConfigCmd.noConfigFound(int);

      const newValue = opt.options?.[0]?.options?.find(o => o.name === tr.for("en-US", "commands.config.names.subcmd.args.newValue"))?.value as TCfgValue | undefined;
      if(typeof newValue === "undefined") {
        return int.editReply(useEmbedify(tr.for(locale, "commands.config.set.currentValue", {
          settingName: tr.for(locale, settingNameTrKey),
          newValue: getValueLabel(cfg[cfgProp] as TCfgValue, locale) ?? cfg[cfgProp],
        })));
      }

      if(typeof validateValue === "function" && !validateValue(newValue))
        return int.editReply(useEmbedify(tr.for(locale, "commands.config.set.invalidValue", {
          settingName: tr.for(locale, settingNameTrKey),
          newValue,
          invalidHintSuffix: invalidHintTrKey ? `\n${tr.for(locale, invalidHintTrKey, invalidHintArgs ?? {})}` : "",
        }), Col.Error));

      cfg[cfgProp] = newValue;
      cfg.lastAccessed = new Date();
      await em.flush();

      if(cfgProp === "locale" && !this.global)
        await registerCommandsForGuild(int.guildId);

      // if no translations exist for the new locale, warn the user
      const localeChanged = locale !== newValue;
      if(localeChanged && !getRegisteredTranslations().has(String(newValue)) && opt.options?.[0]?.name === getSCNames().locale){
        const loc = localesJson.find(({ code }) => code === newValue);
        return await int.editReply(useEmbedify(tr.for(locale, "commands.config.set.localeNotFoundWarning", {
          localeName: loc ? `${loc.name} (${loc.nativeName})` : newValue,
          supportServerInviteUrl: getEnvVar("SUPPORT_SERVER_INVITE_URL"),
        }), Col.Warning));
      }

      return int.editReply(useEmbedify(tr.for(locale, "commands.config.set.success", {
        settingName: tr.for(locale, settingNameTrKey),
        newValue: getValueLabel(newValue, locale) ?? newValue,
      }), Col.Success));
    }
    catch(err) {
      // a failed flush leaves the rejected change in the unit of work, which would make all following flushes (including `/config reset`) fail too
      discardEntity(cfg);

      return int.editReply(useEmbedify(tr.for(locale, "commands.config.set.error", {
        settingName: tr.for(locale, settingNameTrKey),
        err: err instanceof Error ? err.message : tr.for(locale, "errors.unknown"),
      }), Col.Error));
    }
  }
}
