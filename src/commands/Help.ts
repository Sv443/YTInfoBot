import { SlashCommandBuilder, type CommandInteraction, type CommandInteractionOption } from "discord.js";
import { embedify } from "@lib/embedify.ts";
import { CmdBase, SlashCommand } from "@lib/Command.ts";
import packageJson from "@root/package.json" with { type: "json" };
import { getEnvVar } from "@lib/env.ts";
import { bitSetHas } from "@lib/math.ts";
import { getLocMap, tr } from "@lib/translate.ts";
import { cmdInstances } from "@lib/registry.ts";

//#region constructor

export class HelpCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CmdBase.getCmdName(tr.forLang("en-US", "commands.help.names.command")))
      .setNameLocalizations(getLocMap("commands.help.names.command", HelpCmd.cmdPrefix))
      .setDescription(tr.forLang("en-US", "commands.help.descriptions.command"))
      .setDescriptionLocalizations(getLocMap("commands.help.descriptions.command"))
      .addSubcommand(subcommand =>
        subcommand
          .setName(CmdBase.getCmdName(tr.forLang("en-US", "commands.help.names.subcmd.commands")))
          .setNameLocalizations(getLocMap("commands.help.names.subcmd.commands"))
          .setDescription(tr.forLang("en-US", "commands.help.descriptions.subcmd.commands"))
          .setDescriptionLocalizations(getLocMap("commands.help.descriptions.subcmd.commands"))
          .addBooleanOption(option =>
            option
              .setName(tr.forLang("en-US", "commands.help.names.args.show_hidden"))
              .setNameLocalizations(getLocMap("commands.help.names.args.show_hidden"))
              .setDescription(tr.forLang("en-US", "commands.help.descriptions.args.show_hidden"))
              .setDescriptionLocalizations(getLocMap("commands.help.descriptions.args.show_hidden"))
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName(CmdBase.getCmdName(tr.forLang("en-US", "commands.help.names.subcmd.info")))
          .setNameLocalizations(getLocMap("commands.help.names.subcmd.info"))
          .setDescription(tr.forLang("en-US", "commands.help.descriptions.subcmd.info"))
          .setDescriptionLocalizations(getLocMap("commands.help.descriptions.subcmd.info"))
      )
    );
  }

  //#region pb:run

  public async run(int: CommandInteraction, opt: CommandInteractionOption) {
    if(!HelpCmd.checkInGuild(int))
      return;
    const locale = await HelpCmd.getGuildLocale(int);
    switch(opt.name) {
    case "commands": {
      let cmdList = "";

      const hiddenCmds = new Set<string>();
      const showHidden = int.options.get("show_hidden")?.value as boolean ?? true;
      let ephemeral = false;

      const allowedCmds = [...cmdInstances.values()]
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

      for(const { builderJson: cmdData } of allowedCmds)
        cmdList += `- ${hiddenCmds.has(cmdData.name) ? "🔒 " : ""}\`/${cmdData.name}\`${"description" in cmdData ? `\n  ${cmdData.description}` : ""}\n`;

      return int.reply({
        embeds: [
          embedify(cmdList)
            .setTitle(tr.forLang(locale, "commands.help.embedTitles.commands"))
            .setFooter({ text: tr.forLang(locale, "commands.help.embedFooters.commands") }),
        ],
        ephemeral,
      });
    }
    case "info":
      return int.reply({
        embeds: [
          embedify([
            tr.forLang(locale, "commands.help.info.version", packageJson.version),
            tr.forLang(locale, "commands.help.info.createdBy", packageJson.author.name, packageJson.author.url),
            "",
            tr.forLang(locale, "commands.help.info.globalOptOut"),
            "",
            tr.forLang(locale, "commands.help.info.bugsLink", packageJson.bugs.url),
            tr.forLang(locale, "commands.help.info.supportServerLink", getEnvVar("SUPPORT_SERVER_INVITE_URL")),
            tr.forLang(locale, "commands.help.info.donationLink", packageJson.funding.url),
            "",
            tr.forLang(locale, "commands.help.info.poweredBy"),
          ])
            .setTitle("commands.help.embedTitles.info"),
        ],
      });
    }
  }
}
