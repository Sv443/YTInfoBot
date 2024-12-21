import { SlashCommandBuilder, type CommandInteraction, type CommandInteractionOption } from "discord.js";
import { embedify } from "@lib/embedify.ts";
import { CmdBase, SlashCommand } from "@lib/Command.ts";
import { commands } from "@cmd/_commands.ts";
import packageJson from "@root/package.json" with { type: "json" };
import { getEnvVar } from "@lib/env.ts";
import { bitSetHas } from "@lib/math.ts";

//#region constructor

export class HelpCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CmdBase.getCmdName("help"))
      .setDescription("List all commands or get information about the bot")
      .addSubcommand(subcommand =>
        subcommand
          .setName("commands")
          .setDescription("List all commands")
          .addBooleanOption(option =>
            option
              .setName("show_hidden")
              .setDescription("Show commands that need higher permissions, as long as you can use them - reply is only shown to you")
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName("info")
          .setDescription("Get information about the bot")
      )
    );
  }

  //#region pb:run

  public async run(int: CommandInteraction, opt: CommandInteractionOption) {
    switch(opt.name) {
    case "commands": {
      let cmdList = "";

      const hiddenCmds = new Set<string>();
      const showHidden = int.options.get("show_hidden")?.value as boolean ?? true;
      let ephemeral = false;

      const allowedCmds = [...commands]
        .sort((a, b) => a.builderJson.name.localeCompare(b.builderJson.name))
        .filter(cmd => {
          if(typeof cmd.builderJson.default_member_permissions === "undefined" || cmd.builderJson.default_member_permissions === "0")
            return true;
          const permNum = BigInt(cmd.builderJson.default_member_permissions as string);
          if(typeof int.member?.permissions === "undefined")
            return false;
          const hasPerms = bitSetHas(BigInt(int.member.permissions as string), permNum);
          if(hasPerms) {
            ephemeral = true;
            if(showHidden)
              hiddenCmds.add(cmd.builderJson.name);
          }
          return showHidden ? hasPerms : false;
        });

      if(!showHidden)
        ephemeral = false;

      for(const { builderJson: { name, description } } of allowedCmds)
        cmdList += `- ${hiddenCmds.has(name) ? "🔒 " : ""}\`/${name}\`\n  ${description}\n`;

      return int.reply({
        embeds: [
          embedify(cmdList)
            .setTitle("Commands:"),
        ],
        ephemeral,
      });
    }
    case "info":
      return int.reply({
        embeds: [
          embedify([
            `Version: ${packageJson.version}`,
            `Created by [${packageJson.author.name}](${packageJson.author.url})`,
            "",
            "Opt out of automatic replies across every server by using the command `/settings set auto_reply new_value:false`",
            "",
            `- Submit bugs or feature requests on [GitHub](${packageJson.bugs.url})`,
            `- Join the [support server](${getEnvVar("SUPPORT_SERVER_INVITE_URL")}) if you have any questions or need help`,
            `- This bot is completely free so please consider [supporting the development ❤️](${packageJson.funding.url})`,
            "",
            "Powered by [ReturnYoutubeDislike](https://returnyoutubedislike.com/), [SponsorBlock](https://sponsor.ajay.app/), and [DeArrow](https://dearrow.ajay.app/)",
          ])
            .setTitle("Information:")
        ],
      });
    }
  }
}
