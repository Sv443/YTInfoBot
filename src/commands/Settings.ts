import { ButtonBuilder, ButtonStyle, SlashCommandBuilder, type CommandInteraction, type CommandInteractionOption, type SlashCommandSubcommandBuilder } from "discord.js";
import { EbdColors, embedify, useEmbedify } from "@lib/embedify.ts";
import { CommandBase, SlashCommand } from "@lib/Command.ts";
import { em } from "@lib/db.ts";
import { UserSettings } from "@models/UserSettings.model.ts";
import { useButtons } from "@lib/components.ts";
import { capitalize } from "@lib/text.ts";
import type { Stringifiable } from "@/types.ts";
import { autoReplyValues } from "@cmd/Config.ts";

//#region constants

/** Configuration setting name mapping - value has to adhere to Discord slash command naming rules (lowercase and underscores only!) */
const scNames = {
  autoReplyEnabled: "auto_reply",
} as const satisfies Partial<Record<keyof UserSettings, string>>;

/** All options that can be configured */
const configurableOptions: Record<
  typeof scNames[keyof typeof scNames],
  Omit<Parameters<typeof SettingsCmd.editSetting>[0], "int" | "opt"> & {
    builder: (grpOpt: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder;
  }
> = {
  [scNames.autoReplyEnabled]: {
    settProp: "autoReplyEnabled",
    settingName: "auto reply state",
    getValueLabel: (val) => autoReplyValues.find(c => c.value === Boolean(val))?.name,
    builder: (grpOpt: SlashCommandSubcommandBuilder) => grpOpt
      .setDescription("Change whether the bot will automatically reply to your messages containing a video link")
      .addBooleanOption(opt =>
        opt.setName("new_value")
          .setDescription("Whether auto-reply should be enabled")
          .setRequired(true)
      )
  },
} as const;

//#region constructor

export class SettingsCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CommandBase.getCmdName("settings"))
      .setDescription("View or edit the bot's settings for your user account")
      .addSubcommand(option => option
        .setName("reset")
        .setDescription("Reset the settings to the default values")
      )
      .addSubcommand(option => option
        .setName("list")
        .setDescription("List all configurable settings and their current values")
      )
      .addSubcommand(option => option
        .setName("delete_data")
        .setDescription("Delete all data associated with your user account")
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

  //#region pb:run

  public async run(int: CommandInteraction, opt: CommandInteractionOption) {
    const reply = await int.deferReply({ ephemeral: true });

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
      const sett = await em.findOne(UserSettings, { id: int.user.id });

      if(!sett)
        return SettingsCmd.noSettingsFound(int);

      const cfgList = Object.entries(configurableOptions).reduce((acc, [, { settProp: cfgProp, settingName, getValueLabel: getLabel }], i) => {
        const val = getLabel ? getLabel(sett[cfgProp]) : sett[cfgProp];
        return `${acc}${i !== 0 ? "\n" : ""}- **${capitalize(settingName)}**: \`${val}\``;
      }, "");

      return int.editReply({
        embeds: [
          embedify(cfgList, EbdColors.Info)
            .setTitle("User settings values:")
            .setFooter({ text: "Use /settings set <name> to edit a setting" }),
        ],
      });
    }
    case "delete_data": {
      if(!await em.findOne(UserSettings, { id: int.user.id }))
        return int.editReply(useEmbedify("No user settings found - there is nothing to delete", EbdColors.Info));

      const confirmBtns = [
        new ButtonBuilder()
          .setCustomId("confirm-delete-data")
          .setStyle(ButtonStyle.Danger)
          .setLabel("Delete")
          .setEmoji("🗑️"),
        new ButtonBuilder()
          .setCustomId("cancel-delete-data")
          .setStyle(ButtonStyle.Secondary)
          .setLabel("Cancel")
          .setEmoji("❌"),
      ];

      await int.editReply({
        embeds: [
          embedify("**Are you sure you want to delete all data associated with your user account?**\nNote: if you manually use a command, your user ID might be recorded again.\nFor enhanced privacy you can also block the bot to prevent it from reading your message content.\nNo persistent data will be saved for automatic replies.", EbdColors.Warning)
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

        if(conf.customId === "confirm-delete-data") {
          await em.removeAndFlush(await em.find(UserSettings, { id: int.user.id }));
          return conf.editReply({
            ...useEmbedify("Data successfully deleted.", EbdColors.Success),
            components: [],
          });
        }
        else {
          return await conf.editReply({
            ...useEmbedify("Deletion cancelled.", EbdColors.Secondary),
            components: [],
          });
        }
      }
      catch {
        return await (conf ?? int).editReply({
          ...useEmbedify("Confirmation not received within 30s, cancelling deletion.", EbdColors.Secondary),
          components: [],
        });
      }
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
        embeds: [
          embedify("**Are you sure you want to reset your settings?**", EbdColors.Warning)
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

        if(conf.customId === "confirm-reset-settings") {
          const sett = await em.findOne(UserSettings, { id: int.guildId });
          sett && await em.removeAndFlush(sett);
          await em.persistAndFlush(new UserSettings(int.user.id));
          return conf.editReply({
            ...useEmbedify("Settings successfully reset to the default values.", EbdColors.Success),
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

  //#region s:utils

  static noSettingsFound(int: CommandInteraction) {
    int[int.deferred || int.replied ? "editReply" : "reply"](useEmbedify("No user settings found - please run `/settings reset`", EbdColors.Error));
  }

  /** Call to make sure that the settings exist for the user - returns either the current settings or the newly created ones */
  public static async ensureSettingsExist(userId: string) {
    const foundSett = await em.findOne(UserSettings, { id: userId });
    if(!foundSett) {
      const sett = new UserSettings(userId);
      await em.persistAndFlush(sett);
      return sett;
    }
    else
      return foundSett;
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
    getValueLabel?: (value: TSettValue) => Stringifiable | undefined;
    validateValue?: (value: TSettValue) => boolean;
    invalidHint?: string;
  }) {
    try {
      const cfg = await em.findOne(UserSettings, { id: int.user.id });

      if(!cfg)
        return SettingsCmd.noSettingsFound(int);

      const newValue = opt.options?.[0]?.options?.find(o => o.name === "new_value")?.value as TSettValue | undefined;
      if(typeof newValue === "undefined") {
        const cfg = await em.findOne(UserSettings, { id: int.user.id });
        if(!cfg)
          return SettingsCmd.noSettingsFound(int);
        return int.editReply(useEmbedify(`The current ${settingName} is \`${getValueLabel(cfg[settProp] as TSettValue) ?? cfg[settProp]}\``));
      }

      if(typeof validateValue === "function" && !validateValue(newValue))
        return int.editReply(useEmbedify(`Invalid ${settingName} specified: \`${newValue}\`${invalidHint ? `\n${invalidHint}` : ""}`, EbdColors.Error));

      cfg[settProp] = newValue;
      await em.flush();

      return int.editReply(useEmbedify(`Successfully set the ${settingName} to \`${getValueLabel(newValue) ?? newValue}\``, EbdColors.Success));
    }
    catch(err) {
      return int.editReply(useEmbedify(`Couldn't set the ${settingName} due to an error: ${err}`, EbdColors.Error));
    }
  }
}
