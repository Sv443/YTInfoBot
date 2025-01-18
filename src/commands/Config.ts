import { ButtonBuilder, ButtonStyle, PermissionFlagsBits, SlashCommandBuilder, type AutocompleteInteraction, type CommandInteraction, type CommandInteractionOption, type SlashCommandSubcommandBuilder } from "discord.js";
import { Col, useEmbedify } from "@lib/embedify.ts";
import { CmdBase, SlashCommand } from "@lib/Command.ts";
import { numberFormatChoices, videoInfoTypeChoices } from "@cmd/VideoInfo.ts";
import { em } from "@lib/db.ts";
import { GuildConfig } from "@models/GuildConfig.model.ts";
import { useButtons } from "@lib/components.ts";
import { capitalize } from "@lib/text.ts";
import localesJson from "@assets/locales.json" with { type: "json" };
import type { Stringifiable } from "@src/types.ts";
import { registerCommandsForGuild } from "@lib/registry.ts";
import { getLocMap, getRegisteredLanguages, tr, type TrKeyEn } from "@lib/translate.ts";
import { getEnvVar } from "@lib/env.ts";

//#region constants

/** Configuration setting name mapping - value has to adhere to Discord slash command naming rules (lowercase and underscores only!) */
const getSCNames = () => ({
  defaultVideoInfoType: tr.for("en-US", "commands.config.names.subcmd.settings.defaultVideoInfoType"),
  numberFormat: tr.for("en-US", "commands.config.names.subcmd.settings.numberFormat"),
  locale: tr.for("en-US", "commands.config.names.subcmd.settings.locale"),
  autoReplyEnabled: tr.for("en-US", "commands.config.names.subcmd.settings.autoReplyEnabled"),
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
      getValueLabel: (val: string | boolean | Date) => videoInfoTypeChoices.find(c => c.value === val)?.name,
      builder: (grpOpt: SlashCommandSubcommandBuilder) => grpOpt
        .setDescription(tr.for("en-US", "commands.config.descriptions.settings.defaultVideoInfoType"))
        .setDescriptionLocalizations(getLocMap("commands.config.descriptions.settings.defaultVideoInfoType"))
        .addStringOption(opt =>
          opt.setName(tr.for("en-US", "commands.config.names.subcmd.args.newValue"))
            .setNameLocalizations(getLocMap("commands.config.names.subcmd.args.newValue"))
            .setDescription(tr.for("en-US", "commands.config.descriptions.args.newValue"))
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
        .setDescription(tr.for("en-US", "commands.config.descriptions.settings.numberFormat"))
        .setDescriptionLocalizations(getLocMap("commands.config.descriptions.settings.numberFormat"))
        .addStringOption(opt =>
          opt.setName(tr.for("en-US", "commands.config.names.subcmd.args.newValue"))
            .setNameLocalizations(getLocMap("commands.config.names.subcmd.args.newValue"))
            .setDescription(tr.for("en-US", "commands.config.descriptions.args.newValue"))
            .setDescriptionLocalizations(getLocMap("commands.config.descriptions.args.newValue"))
            .setChoices(numberFormatChoices)
            .setRequired(true)
        )
    },
    [scNames.locale]: {
      cfgProp: "locale",
      settingNameTrKey: "commands.config.names.subcmd.settingNames.locale",
      getValueLabel: (val: string | boolean | Date) => localesJson.find(({ code }) => code === val)?.name,
      validateValue: (val: string | boolean | Date) => localesJson.some(({ code }) => code === val),
      invalidHintTrKey: "commands.config.set.localeInvalidHint",
      builder: (grpOpt: SlashCommandSubcommandBuilder) => grpOpt
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
      getValueLabel: (val: string | boolean | Date, loc: string) => getAutoReplyValues(loc).find(c => c.value === Boolean(val))?.name,
      builder: (grpOpt: SlashCommandSubcommandBuilder) => grpOpt
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
          const cfg = await em.findOne(GuildConfig, { id: int.guildId });
          cfg && await em.removeAndFlush(cfg);
          await em.persistAndFlush(new GuildConfig(int.guildId));
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
      catch {
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
    const acResAmt = isNaN(maxAcRes) ? 25 : Math.min(maxAcRes, 25);

    let loc: string | undefined;

    await Promise.race([
      (async () => {
        loc = await ConfigCmd.getGuildLocale(int);
      })(),
      new Promise<void>(res => setTimeout(res, 1500)),
    ]);

    switch(int.options.getSubcommand(true)) {
    case "locale":
      return int.respond(
        [...localesJson]
          .filter(({ code, name, nativeName }) =>
            code.toLowerCase().includes(searchVal)
            || name.toLowerCase().includes(searchVal)
            || nativeName.toLowerCase().includes(searchVal)
          )
          .slice(0, acResAmt)
          .map(({ code, name, nativeName }) => ({ value: code, name: /\(.+\)/.test(name) ? name : `${name} (${nativeName})` }))
          .sort((a, b) => a.name.localeCompare(b.name, loc))
      );
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
  }: {
    int: CommandInteraction;
    opt: CommandInteractionOption;
    cfgProp: TCfgKey;
    settingNameTrKey: TrKeyEn;
    getValueLabel?: (value: TCfgValue, locale: string) => Stringifiable | undefined;
    validateValue?: (value: TCfgValue) => boolean;
    invalidHintTrKey?: TrKeyEn;
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

      const newValue = opt.options?.[0]?.options?.find(o => o.name === tr.for("en-US", "commands.config.names.subcmd.args.newValue"))?.value as TCfgValue | undefined;
      if(typeof newValue === "undefined") {
        const cfg = await em.findOne(GuildConfig, { id: int.guildId });
        if(!cfg)
          return await ConfigCmd.noConfigFound(int);

        return int.editReply(useEmbedify(tr.for(locale, "commands.config.set.currentValue", {
          settingName: tr.for(locale, settingNameTrKey),
          newValue: getValueLabel(cfg[cfgProp] as TCfgValue, locale) ?? cfg[cfgProp],
        })));
      }

      if(typeof validateValue === "function" && !validateValue(newValue))
        return int.editReply(useEmbedify(tr.for(locale, "commands.config.set.invalidValue", {
          settingName: tr.for(locale, settingNameTrKey),
          newValue,
          invalidHint: invalidHintTrKey ? `\n${tr.for(locale, invalidHintTrKey)}` : "",
        }), Col.Error));

      cfg[cfgProp] = newValue;
      cfg.lastAccessed = new Date();
      await em.flush();

      if(cfgProp === "locale" && !this.global)
        await registerCommandsForGuild(int.guildId);

      // if no translations exist for the new locale, warn the user
      const localeChanged = locale !== newValue;
      if(localeChanged && !getRegisteredLanguages().has(String(newValue)) && opt.options?.[0]?.name === getSCNames().locale){
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
      return int.editReply(useEmbedify(tr.for(locale, "commands.config.set.error", {
        settingName: tr.for(locale, settingNameTrKey),
        err: err instanceof Error ? err.message : tr.for(locale, "errors.unknown"),
      }), Col.Error));
    }
  }
}
