import { ButtonBuilder, ButtonStyle, MessageFlags, SlashCommandBuilder, type CommandInteraction, type CommandInteractionOption, type SlashCommandSubcommandBuilder } from "discord.js";
import { Col, useEmbedify } from "@lib/embedify.js";
import { CmdBase, SlashCommand } from "@lib/Command.js";
import { em } from "@lib/db.js";
import { UserSettings } from "@models/UserSettings.model.js";
import { useButtons } from "@lib/components.js";
import { capitalize } from "@lib/text.js";
import { getAutoReplyValues } from "@cmd/Config.js";
import type { Stringifiable } from "@src/types.js";
import { getLocMap, tr, type TrKeyEn } from "@lib/translate.js";

//#region constants

/** Configuration setting name mapping - value has to adhere to Discord slash command naming rules (lowercase and underscores only!) */
const getSCNames = () => ({
  autoReplyEnabled: tr.for("en-US", "commands.settings.names.subcmd.settings.autoReplyEnabled"),
} as const satisfies Partial<Record<keyof UserSettings, string>>);

/** All options that can be configured - has to be called lazily, after the translations were loaded */
const getConfigurableOptions = () => {
  const scNames = getSCNames();

  return {
    [scNames.autoReplyEnabled]: {
      settProp: "autoReplyEnabled",
      settingNameTrKey: "commands.settings.settingName.autoReplyEnabled",
      getValueLabel: (val: unknown, loc: string) => getAutoReplyValues(loc).find(c => c.value === Boolean(val))?.name,
      builder: (grpOpt: SlashCommandSubcommandBuilder) => grpOpt
        .setNameLocalizations(getLocMap("commands.settings.names.subcmd.settings.autoReplyEnabled"))
        .setDescription(tr.for("en-US", "commands.settings.changeSettingDescription.autoReplyEnabled"))
        .setDescriptionLocalizations(getLocMap("commands.settings.changeSettingDescription.autoReplyEnabled"))
        .addBooleanOption(opt =>
          opt.setName(tr.for("en-US", "commands.settings.names.subcmd.args.newValue"))
            .setNameLocalizations(getLocMap("commands.settings.names.subcmd.args.newValue"))
            .setDescription(tr.for("en-US", "commands.settings.changeSettingDescription.autoReplyEnabledArg"))
            .setDescriptionLocalizations(getLocMap("commands.settings.changeSettingDescription.autoReplyEnabledArg"))
            .setRequired(true)
        )
    },
  } as const satisfies Record<
    ReturnType<typeof getSCNames>[keyof ReturnType<typeof getSCNames>],
    Omit<Parameters<typeof SettingsCmd.editSetting>[0], "int" | "opt"> & {
      builder: (grpOpt: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder;
    }
  >;
};

//#region constructor

export class SettingsCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CmdBase.getCmdName(tr.for("en-US", "commands.settings.names.command")))
      .setNameLocalizations(getLocMap("commands.settings.names.command", SettingsCmd.cmdPrefix))
      .setDescription(tr.for("en-US", "commands.settings.descriptions.command"))
      .setDescriptionLocalizations(getLocMap("commands.settings.descriptions.command"))
      .addSubcommand(option => option
        .setName(tr.for("en-US", "commands.settings.names.subcmd.reset"))
        .setNameLocalizations(getLocMap("commands.settings.names.subcmd.reset"))
        .setDescription(tr.for("en-US", "commands.settings.descriptions.subcmd.reset"))
        .setDescriptionLocalizations(getLocMap("commands.settings.descriptions.subcmd.reset"))
      )
      .addSubcommand(option => option
        .setName(tr.for("en-US", "commands.settings.names.subcmd.list"))
        .setNameLocalizations(getLocMap("commands.settings.names.subcmd.list"))
        .setDescription(tr.for("en-US", "commands.settings.descriptions.subcmd.list"))
        .setDescriptionLocalizations(getLocMap("commands.settings.descriptions.subcmd.list"))
      )
      .addSubcommandGroup(grpOpt => {
        grpOpt
          .setName(tr.for("en-US", "commands.settings.names.subcmd.set"))
          .setNameLocalizations(getLocMap("commands.settings.names.subcmd.set"))
          .setDescription(tr.for("en-US", "commands.settings.descriptions.subcmd.set"))
          .setDescriptionLocalizations(getLocMap("commands.settings.descriptions.subcmd.set"));

        for(const [name, { builder }] of Object.entries(getConfigurableOptions()))
          grpOpt.addSubcommand(option => builder(option).setName(name));

        return grpOpt;
      })
    );
  }

  //#region pb:run

  public async run(int: CommandInteraction, opt: CommandInteractionOption) {
    const reply = await int.deferReply({ flags: [MessageFlags.Ephemeral] });

    const locale = await SettingsCmd.getGuildLocale(int);
    const configurableOptions = getConfigurableOptions();
    const t = tr.use(locale);

    switch(opt.name) {
    case "set":
      if(!opt.options?.[0])
        throw new Error("No subcommand provided in /settings set");

      return await SettingsCmd.editSetting({
        int,
        opt,
        ...configurableOptions[opt.options[0].name as keyof typeof configurableOptions],
      });
    case "list": {
      await UserSettings.ensureExists(int.user.id);
      const sett = await em.findOne(UserSettings, { id: int.user.id });

      if(!sett)
        return SettingsCmd.noSettingsFound(int);

      const cfgList = Object.entries(configurableOptions).reduce((acc, [, { settProp: cfgProp, settingNameTrKey, getValueLabel: getLabel }], i) => {
        const val = getLabel ? getLabel(sett[cfgProp], locale) : sett[cfgProp];
        return `${acc}${i !== 0 ? "\n" : ""}- **${capitalize(t(settingNameTrKey))}**: \`${val}\``;
      }, "");

      return int.editReply(useEmbedify(cfgList, Col.Info, (e) => e
        .setTitle(t("commands.settings.listEmbed.title"))
        .setFooter({ text: t("commands.settings.listEmbed.footer") })
      ));
    }
    case "reset": {
      const confirmBtns = [
        new ButtonBuilder()
          .setCustomId("confirm-reset-settings")
          .setStyle(ButtonStyle.Danger)
          .setLabel(t("buttons.reset"))
          .setEmoji("♻️"),
        new ButtonBuilder()
          .setCustomId("cancel-reset-settings")
          .setStyle(ButtonStyle.Secondary)
          .setLabel(t("buttons.cancel"))
          .setEmoji("❌"),
      ];

      await int.editReply({
        ...useEmbedify(`**${t("commands.settings.reset.confirm")}**`, Col.Warning, (e) =>
          e.setFooter({ text: t("general.promptExpiryNotice", 30) })
        ),
        ...useButtons([confirmBtns]),
      });

      let conf;

      try {
        conf = await reply.awaitMessageComponent({
          filter: ({ user }) => user.id === int.user.id,
          time: 30_000,
        });

        await conf.deferUpdate();

        if(conf.customId === "confirm-reset-settings") {
          const sett = await em.findOne(UserSettings, { id: int.user.id });
          sett && await em.removeAndFlush(sett);
          await em.persistAndFlush(new UserSettings(int.user.id));
          return conf.editReply({
            ...useEmbedify(t("commands.settings.reset.success"), Col.Success),
            components: [],
          });
        }
        else {
          await conf.editReply({
            ...useEmbedify(t("commands.settings.reset.cancelled"), Col.Secondary),
            components: [],
          });
        }
      }
      catch {
        await (conf ?? int).editReply({
          ...useEmbedify(t("general.confirmationTimeoutNotice", 30), Col.Secondary),
          components: [],
        });
      }
    }
    }
  }

  //#region s:utils

  static async noSettingsFound(int: CommandInteraction) {
    int[int.deferred || int.replied ? "editReply" : "reply"](useEmbedify(tr.for(await SettingsCmd.getGuildLocale(int), "errors.userSettingsInaccessible"), Col.Error));
  }

  /** Call to edit or view the passed configuration setting */
  public static async editSetting<
    TSettKey extends keyof UserSettings,
    TSettValue extends UserSettings[TSettKey],
  >({
    int,
    opt,
    settProp,
    settingNameTrKey,
    getValueLabel = (val) => val,
    validateValue,
    invalidHintTrKey,
  }: {
    int: CommandInteraction;
    opt: CommandInteractionOption;
    settProp: TSettKey;
    settingNameTrKey: TrKeyEn;
    getValueLabel?: (value: TSettValue, locale: string) => Stringifiable | undefined;
    validateValue?: (value: TSettValue) => boolean;
    invalidHintTrKey?: TrKeyEn;
  }) {
    const locale = await SettingsCmd.getGuildLocale(int);

    try {
      await UserSettings.ensureExists(int.user.id);
      const cfg = await em.findOne(UserSettings, { id: int.user.id });

      if(!cfg)
        return SettingsCmd.noSettingsFound(int);

      const settingName = tr.for(locale, settingNameTrKey);

      const newValue = opt.options?.[0]?.options?.find(o => o.name === tr.for("en-US", "commands.settings.names.subcmd.args.newValue"))?.value as TSettValue | undefined;
      if(typeof newValue === "undefined") {
        return int.editReply(useEmbedify(tr.for(locale, "commands.settings.set.currentValue", {
          settingName,
          newValue: getValueLabel(cfg[settProp] as TSettValue, locale) ?? cfg[settProp],
        })));
      }

      if(typeof validateValue === "function" && !validateValue(newValue))
        return int.editReply(useEmbedify(tr.for(locale, "commands.settings.set.invalidValue", {
          settingName,
          newValue,
          invalidHintSuffix: invalidHintTrKey ? `\n${tr.for(locale, invalidHintTrKey)}` : "",
        }), Col.Error));

      cfg[settProp] = newValue;
      cfg.lastAccessed = new Date();
      await em.flush();

      return int.editReply(useEmbedify(tr.for(locale, "commands.settings.set.success", {
        settingName,
        newValue: getValueLabel(newValue, locale) ?? newValue,
      }), Col.Success));
    }
    catch(err) {
      return int.editReply(useEmbedify(tr.for(locale, "commands.settings.set.error", {
        settingName: tr.for(locale, settingNameTrKey),
        err: err instanceof Error ? err.message : tr.for(locale, "errors.unknown"),
      }), Col.Error));
    }
  }
}
