import { ButtonBuilder, ButtonStyle, SlashCommandBuilder, type CommandInteraction, type CommandInteractionOption, type SlashCommandSubcommandBuilder } from "discord.js";
import { Col, useEmbedify } from "@lib/embedify.js";
import { CmdBase, SlashCommand } from "@lib/Command.js";
import { em } from "@lib/db.js";
import { UserSettings } from "@models/UserSettings.model.js";
import { useButtons } from "@lib/components.js";
import { capitalize } from "@lib/text.js";
import { getAutoReplyValues } from "@cmd/Config.js";
import { GuildConfig } from "@models/GuildConfig.model.js";
import type { Stringifiable } from "@src/types.js";
import { getLocMap, tr } from "@lib/translate.js";

// TODO: translate

//#region constants

/** Configuration setting name mapping - value has to adhere to Discord slash command naming rules (lowercase and underscores only!) */
const scNames = {
  autoReplyEnabled: "auto_reply",
} as const satisfies Partial<Record<keyof UserSettings, string>>;

/** All options that can be configured */
const getConfigurableOptions: (locale: string) => Record<
  typeof scNames[keyof typeof scNames],
  Omit<Parameters<typeof SettingsCmd.editSetting>[0], "int" | "opt"> & {
    builder: (grpOpt: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder;
  }
> = (locale: string) => ({
  [scNames.autoReplyEnabled]: {
    settProp: "autoReplyEnabled",
    settingName: tr.for(locale, "commands.settings.settingName.autoReplyEnabled"),
    getValueLabel: (val, loc) => getAutoReplyValues(loc).find(c => c.value === Boolean(val))?.name,
    builder: (grpOpt: SlashCommandSubcommandBuilder) => grpOpt
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
} as const);

//#region constructor

export class SettingsCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CmdBase.getCmdName("settings"))
      .setNameLocalizations(getLocMap("commands.settings.names.command", SettingsCmd.cmdPrefix))
      .setDescription(tr.for("en-US", "commands.settings.descriptions.command"))
      .setDescriptionLocalizations(getLocMap("commands.settings.descriptions.command"))
      .addSubcommand(option => option
        .setName("reset")
        .setNameLocalizations(getLocMap("commands.settings.names.subcmd.reset"))
        .setDescription(tr.for("en-US", "commands.settings.descriptions.subcmd.reset"))
      )
      .addSubcommand(option => option
        .setName("list")
        .setNameLocalizations(getLocMap("commands.settings.names.subcmd.list"))
        .setDescription(tr.for("en-US", "commands.settings.descriptions.subcmd.list"))
      )
      .addSubcommandGroup(grpOpt => {
        grpOpt
          .setName("set")
          .setNameLocalizations(getLocMap("commands.settings.names.subcmd.set"))
          .setDescription(tr.for("en-US", "commands.settings.descriptions.subcmd.set"));

        for(const [name, { builder }] of Object.entries(getConfigurableOptions("en-US")))
          grpOpt.addSubcommand(option => builder(option).setName(name));

        return grpOpt;
      })
    );
  }

  //#region pb:run

  public async run(int: CommandInteraction, opt: CommandInteractionOption) {
    const reply = await int.deferReply({ ephemeral: true });

    const locale = await SettingsCmd.getGuildLocale(int);
    const configurableOptions = getConfigurableOptions(locale);
    const t = tr.use(locale);

    void ["TODO:", t];

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

      let locale = "en-US";
      if(int.inGuild()) {
        await GuildConfig.ensureExists(int.guildId);
        const guildCfg = await em.findOne(GuildConfig, { id: int.guildId });
        locale = guildCfg?.locale ?? locale;
      }

      const cfgList = Object.entries(configurableOptions).reduce((acc, [, { settProp: cfgProp, settingName, getValueLabel: getLabel }], i) => {
        const val = getLabel ? getLabel(sett[cfgProp], locale) : sett[cfgProp];
        return `${acc}${i !== 0 ? "\n" : ""}- **${capitalize(settingName)}**: \`${val}\``;
      }, "");

      return int.editReply(useEmbedify(cfgList, Col.Info, (e) => e
        .setTitle("User settings values:")
        .setFooter({ text: "Use /settings set <name> to edit a setting" })
      ));
    }
    case "reset": {
      const confirmBtns = [
        new ButtonBuilder()
          .setCustomId("confirm-reset-settings")
          .setStyle(ButtonStyle.Danger)
          .setLabel("Reset")
          .setEmoji("♻️"),
        new ButtonBuilder()
          .setCustomId("cancel-reset-settings")
          .setStyle(ButtonStyle.Secondary)
          .setLabel("Cancel")
          .setEmoji("❌"),
      ];

      await int.editReply({
        ...useEmbedify("**Are you sure you want to reset your settings?**", Col.Warning, (e) =>
          e.setFooter({ text: "This prompt will expire in 30s" })
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
            ...useEmbedify("Settings successfully reset to the default values.", Col.Success),
            components: [],
          });
        }
        else {
          await conf.editReply({
            ...useEmbedify("Reset cancelled.", Col.Secondary),
            components: [],
          });
        }
      }
      catch {
        await (conf ?? int).editReply({
          ...useEmbedify("Confirmation not received within 30s, cancelling reset.", Col.Secondary),
          components: [],
        });
      }
    }
    }
  }

  //#region s:utils

  static noSettingsFound(int: CommandInteraction) {
    int[int.deferred || int.replied ? "editReply" : "reply"](useEmbedify("No user settings found - please run `/settings reset`", Col.Error));
  }

  /** Call to edit or view the passed configuration setting */
  public static async editSetting<
    TSettKey extends keyof UserSettings,
    TSettValue extends UserSettings[TSettKey],
  >({
    int,
    opt,
    settProp,
    settingName,
    getValueLabel = (val) => val,
    validateValue,
    invalidHint,
  }: {
    int: CommandInteraction;
    opt: CommandInteractionOption;
    settProp: TSettKey;
    settingName: string;
    getValueLabel?: (value: TSettValue, locale: string) => Stringifiable | undefined;
    validateValue?: (value: TSettValue) => boolean;
    invalidHint?: string;
  }) {
    try {
      await UserSettings.ensureExists(int.user.id);
      const cfg = await em.findOne(UserSettings, { id: int.user.id });

      let locale = "en-US";
      if(int.inGuild()) {
        await GuildConfig.ensureExists(int.guildId);
        const guildCfg = await em.findOne(GuildConfig, { id: int.guildId });
        locale = guildCfg?.locale ?? locale;
      }

      if(!cfg)
        return SettingsCmd.noSettingsFound(int);

      const newValue = opt.options?.[0]?.options?.find(o => o.name === "new_value")?.value as TSettValue | undefined;
      if(typeof newValue === "undefined") {
        const cfg = await em.findOne(UserSettings, { id: int.user.id });
        if(!cfg)
          return SettingsCmd.noSettingsFound(int);
        return int.editReply(useEmbedify(`The current ${settingName} is \`${getValueLabel(cfg[settProp] as TSettValue, locale) ?? cfg[settProp]}\``));
      }

      if(typeof validateValue === "function" && !validateValue(newValue))
        return int.editReply(useEmbedify(`Invalid ${settingName} specified: \`${newValue}\`${invalidHint ? `\n${invalidHint}` : ""}`, Col.Error));

      cfg[settProp] = newValue;
      cfg.lastAccessed = new Date();
      await em.flush();

      return int.editReply(useEmbedify(`Successfully set the ${settingName} to \`${getValueLabel(newValue, locale) ?? newValue}\``, Col.Success));
    }
    catch(err) {
      return int.editReply(useEmbedify(`Couldn't set the ${settingName} due to an error: ${err}`, Col.Error));
    }
  }
}
