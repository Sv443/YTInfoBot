import { ButtonBuilder, ButtonStyle, SlashCommandBuilder, type CommandInteraction } from "discord.js";
import { Col, embedify, useEmbedify } from "@lib/embedify.ts";
import { CmdBase, SlashCommand } from "@lib/Command.ts";
import { em } from "@lib/db.ts";
import { UserSettings } from "@models/UserSettings.model.ts";
import { useButtons } from "@lib/components.ts";
import { getLocMap, tr } from "@lib/translate.ts";

//#region constructor

export class PrivacyCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CmdBase.getCmdName("privacy"))
      .setDescription(tr.forLang("en-US", "commands.privacy.descriptions.command"))
      .setDescriptionLocalizations(getLocMap("commands.privacy.descriptions.command"))
      .addSubcommand((sub) =>
        sub
          .setName("info")
          .setDescription(tr.forLang("en-US", "commands.privacy.descriptions.subcmd.info"))
          .setDescriptionLocalizations(getLocMap("commands.privacy.descriptions.subcmd.info"))
      )
      .addSubcommand((sub) =>
        sub
          .setName("delete_data")
          .setDescription(tr.forLang("en-US", "commands.privacy.descriptions.subcmd.delete_data"))
          .setDescriptionLocalizations(getLocMap("commands.privacy.descriptions.subcmd.delete_data"))
      )
    );
  }

  //#region pb:run

  public async run(int: CommandInteraction) {
    const sub = int.options.data[0].name;

    if(sub === "info")
      return int.reply({
        ...useEmbedify(Array.from({ length: 5 }).map((_, i) => tr(`commands.privacy.info.line${i + 1}`))),
        ephemeral: true,
      });

    if(sub === "delete_data") {
      await int.deferReply({ ephemeral: true });

      if(!await em.findOne(UserSettings, { id: int.user.id }))
        return int.editReply(useEmbedify(tr("errors.noDataFoundToDelete"), Col.Info));

      const confirmBtns = [
        new ButtonBuilder()
          .setCustomId("confirm-delete-data")
          .setStyle(ButtonStyle.Danger)
          .setLabel(tr("buttons.delete"))
          .setEmoji("🗑️"),
        new ButtonBuilder()
          .setCustomId("cancel-delete-data")
          .setStyle(ButtonStyle.Secondary)
          .setLabel(tr("buttons.cancel"))
          .setEmoji("❌"),
      ];

      const promptSec = 60;

      const reply = await int.editReply({
        embeds: [
          embedify(Array.from({ length: 4 }).map((_, i) => tr(`commands.privacy.delete.confirmLine${i + 1}`)), Col.Warning)
            .setFooter({ text: tr("general.promptExpiryNotice", promptSec) }),
        ],
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
            ...useEmbedify(tr("commands.privacy.delete.success"), Col.Success),
            components: [],
          });
        }
        else {
          return await conf.editReply({
            ...useEmbedify(tr("commands.privacy.delete.cancelled"), Col.Secondary),
            components: [],
          });
        }
      }
      catch {
        return await (conf ?? int).editReply({
          ...useEmbedify(tr("commands.privacy.delete.noConfirmation"), Col.Secondary),
          components: [],
        });
      }
    }
  }
}
