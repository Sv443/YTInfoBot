import { ButtonBuilder, ButtonStyle, SlashCommandBuilder, type CommandInteraction } from "discord.js";
import { Col, useEmbedify } from "@lib/embedify.js";
import { CmdBase, SlashCommand } from "@lib/Command.js";
import { em } from "@lib/db.js";
import { UserSettings } from "@models/UserSettings.model.js";
import { useButtons } from "@lib/components.js";
import { getLocMap, tr } from "@lib/translate.js";

//#region constructor

export class PrivacyCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CmdBase.getCmdName(tr.for("en-US", "commands.privacy.names.command")))
      .setNameLocalizations(getLocMap("commands.privacy.names.command", PrivacyCmd.cmdPrefix))
      .setDescription(tr.for("en-US", "commands.privacy.descriptions.command"))
      .setDescriptionLocalizations(getLocMap("commands.privacy.descriptions.command"))
      .addSubcommand((sub) =>
        sub
          .setName(tr.for("en-US", "commands.privacy.names.subcmd.info"))
          .setNameLocalizations(getLocMap("commands.privacy.names.subcmd.info"))
          .setDescription(tr.for("en-US", "commands.privacy.descriptions.subcmd.info"))
          .setDescriptionLocalizations(getLocMap("commands.privacy.descriptions.subcmd.info"))
      )
      .addSubcommand((sub) =>
        sub
          .setName(tr.for("en-US", "commands.privacy.names.subcmd.delete_data"))
          .setNameLocalizations(getLocMap("commands.privacy.names.subcmd.delete_data"))
          .setDescription(tr.for("en-US", "commands.privacy.descriptions.subcmd.delete_data"))
          .setDescriptionLocalizations(getLocMap("commands.privacy.descriptions.subcmd.delete_data"))
      )
    );
  }

  //#region pb:run

  public async run(int: CommandInteraction) {
    if(!PrivacyCmd.checkInGuild(int))
      return;

    await int.deferReply({ ephemeral: true });

    const t = await PrivacyCmd.getTrFunc(int);
    const sub = int.options.data[0].name;

    if(sub === "info")
      return int.editReply(useEmbedify(Array.from({ length: 5 }).map((_, i) => t(`commands.privacy.info.line${(i + 1) as 1}`))));

    if(sub === "delete_data") {
      if(!await em.findOne(UserSettings, { id: int.user.id }))
        return int.editReply(useEmbedify(t("errors.noDataFoundToDelete"), Col.Warning));

      const confirmBtns = [
        new ButtonBuilder()
          .setCustomId("confirm-delete-data")
          .setStyle(ButtonStyle.Danger)
          .setLabel(t("buttons.delete"))
          .setEmoji("🗑️"),
        new ButtonBuilder()
          .setCustomId("cancel-delete-data")
          .setStyle(ButtonStyle.Secondary)
          .setLabel(t("buttons.cancel"))
          .setEmoji("❌"),
      ];

      const promptSec = 60;

      const reply = await int.editReply({
        ...useEmbedify(
          Array.from({ length: 4 }).map((_, i) => t(`commands.privacy.delete.confirmLine${(i + 1) as 1}`)),
          Col.Warning,
          (e) => e.setFooter({ text: t("general.promptExpiryNotice", promptSec) })
        ),
        ...useButtons([confirmBtns]),
      });

      let conf;

      try {
        conf = await reply.awaitMessageComponent({
          filter: ({ user }) => user.id === int.user.id,
          time: promptSec * 1000,
        });

        await conf.deferUpdate();

        if(conf.customId === "confirm-delete-data") {
          await em.removeAndFlush(await em.find(UserSettings, { id: int.user.id }));
          return conf.editReply({
            ...useEmbedify(t("commands.privacy.delete.success"), Col.Success),
            components: [],
          });
        }
        else {
          return await conf.editReply({
            ...useEmbedify(t("commands.privacy.delete.cancelled"), Col.Secondary),
            components: [],
          });
        }
      }
      catch {
        return await (conf ?? int).editReply({
          ...useEmbedify(t("commands.privacy.delete.noConfirmation"), Col.Secondary),
          components: [],
        });
      }
    }
  }
}
