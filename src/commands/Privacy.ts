import { ButtonBuilder, ButtonStyle, SlashCommandBuilder, type CommandInteraction } from "discord.js";
import { Col, embedify, useEmbedify } from "@lib/embedify.ts";
import { CmdBase, SlashCommand } from "@lib/Command.ts";
import { em } from "@lib/db.ts";
import { UserSettings } from "@models/UserSettings.model.ts";
import { useButtons } from "@lib/components.ts";

//#region constructor

export class PrivacyCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CmdBase.getCmdName("privacy"))
      .setDescription("Get information about the bot's privacy or delete your data.")
      .addSubcommand((sub) =>
        sub
          .setName("info")
          .setDescription("Get information about the bot's privacy.")
      )
      .addSubcommand((sub) =>
        sub
          .setName("delete_data")
          .setDescription("Delete all data the bot stored about you.")
      )
    );
  }

  //#region pb:run

  public async run(int: CommandInteraction) {
    const sub = int.options.data[0].name;

    if(sub === "info")
      return int.reply({
        ...useEmbedify([
          "**YTInfoBot stores the following data:**",
          "- When you invite it to your server, it stores the server's ID and the server configuration data (locale, number format, etc.).  ",
          "  After you kick it from your server, it also deletes all server data.",
          "- When editing your user settings, it stores your user ID and the settings you've changed.  ",
          "  You can delete your user data by using the `/privacy delete` command.",
        ]),
        ephemeral: true,
      });

    if(sub === "delete_data") {
      await int.deferReply({ ephemeral: true });

      if(!await em.findOne(UserSettings, { id: int.user.id }))
        return int.editReply(useEmbedify("No user data found to delete.", Col.Info));

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

      const reply = await int.editReply({
        embeds: [
          embedify([
            "**Are you sure you want to delete all data associated with your account?**",
            "If you run certain commands, your user ID and default settings will be stored again.",
            "You can also block the bot to prevent it from reading your messages again.",
            "No data will be saved when the bot automatically replies to you.",
          ], Col.Warning)
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
            ...useEmbedify("Data successfully deleted.", Col.Success),
            components: [],
          });
        }
        else {
          return await conf.editReply({
            ...useEmbedify("Deletion cancelled.", Col.Secondary),
            components: [],
          });
        }
      }
      catch {
        return await (conf ?? int).editReply({
          ...useEmbedify("Confirmation not received within 30s, cancelling deletion.", Col.Secondary),
          components: [],
        });
      }
    }
  }
}
