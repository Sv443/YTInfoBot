import { SlashCommandBuilder, type CommandInteraction, type CommandInteractionOption } from "discord.js";
import { embedify } from "@lib/embedify.ts";
import { CmdBase, SlashCommand } from "@lib/Command.ts";
import { getCommands } from "@cmd/_commands.ts";
import packageJson from "@root/package.json" with { type: "json" };
import { getEnvVar } from "@lib/env.ts";
import { bitSetHas } from "@lib/math.ts";
import { getLocMap, tr } from "@lib/translate.ts";

//#region constructor

export class HelpCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CmdBase.getCmdName("help"))
      .setDescription(tr.forLang("en-US", "commands.help.descriptions.command"))
      .setDescriptionLocalizations(getLocMap("commands.help.descriptions.command"))
      .addSubcommand(subcommand =>
        subcommand
          .setName("commands")
          .setDescription(tr.forLang("en-US", "commands.help.descriptions.subcmd.commands"))
          .setDescriptionLocalizations(getLocMap("commands.help.descriptions.subcmd.commands"))
          .addBooleanOption(option =>
            option
              .setName("show_hidden")
              .setDescription(tr.forLang("en-US", "commands.help.descriptions.args.show_hidden"))
              .setDescriptionLocalizations(getLocMap("commands.help.descriptions.args.show_hidden"))
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName("info")
          .setDescription(tr.forLang("en-US", "commands.help.descriptions.subcmd.info"))
          .setDescriptionLocalizations(getLocMap("commands.help.descriptions.subcmd.info"))
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

      const allowedCmds = [...getCommands()]
        .sort((a, b) => a.builderJson.name.localeCompare(b.builderJson.name))
        .filter(cmd => {
          if(typeof cmd.builderJson.default_member_permissions === "undefined" || cmd.builderJson.default_member_permissions === "0")
            return true;
          if(typeof int.member?.permissions === "undefined")
            return false;

          const hasPerms = bitSetHas(BigInt(int.member.permissions as string), BigInt(cmd.builderJson.default_member_permissions as string));
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
            .setTitle("commands.help.embedTitles.commands"),
        ],
        ephemeral,
      });
    }
    case "info":
      return int.reply({
        embeds: [
          embedify([
            tr("commands.help.info.version", packageJson.version),
            tr("commands.help.info.createdBy", packageJson.author.name, packageJson.author.url),
            "",
            tr("commands.help.info.globalOptOut"),
            "",
            tr("commands.help.info.bugsLink", packageJson.bugs.url),
            tr("commands.help.info.supportServerLink", getEnvVar("SUPPORT_SERVER_INVITE_URL")),
            tr("commands.help.info.donationLink", packageJson.funding.url),
            "",
            tr("commands.help.info.poweredBy"),
          ])
            .setTitle("commands.help.embedTitles.info"),
        ],
      });
    }
  }
}
