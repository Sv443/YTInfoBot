import { SlashCommandBuilder, type CommandInteraction, type CommandInteractionOption } from "discord.js";
import { useEmbedify } from "@lib/embedify.ts";
import { CmdBase, SlashCommand } from "@lib/Command.ts";
import pkg from "@root/package.json" with { type: "json" };
import { getEnvVar } from "@lib/env.ts";
import { bitSetHas } from "@lib/math.ts";
import { getLocMap, tr } from "@lib/translate.ts";
import { cmdInstances } from "@lib/registry.ts";

//#region constructor

export class HelpCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CmdBase.getCmdName(tr.for("en-US", "commands.help.names.command")))
      .setNameLocalizations(getLocMap("commands.help.names.command", HelpCmd.cmdPrefix))
      .setDescription(tr.for("en-US", "commands.help.descriptions.command"))
      .setDescriptionLocalizations(getLocMap("commands.help.descriptions.command"))
      .addSubcommand(subcommand =>
        subcommand
          .setName(tr.for("en-US", "commands.help.names.subcmd.commands"))
          .setNameLocalizations(getLocMap("commands.help.names.subcmd.commands"))
          .setDescription(tr.for("en-US", "commands.help.descriptions.subcmd.commands"))
          .setDescriptionLocalizations(getLocMap("commands.help.descriptions.subcmd.commands"))
          .addBooleanOption(option =>
            option
              .setName(tr.for("en-US", "commands.help.names.args.show_hidden"))
              .setNameLocalizations(getLocMap("commands.help.names.args.show_hidden"))
              .setDescription(tr.for("en-US", "commands.help.descriptions.args.show_hidden"))
              .setDescriptionLocalizations(getLocMap("commands.help.descriptions.args.show_hidden"))
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName(tr.for("en-US", "commands.help.names.subcmd.info"))
          .setNameLocalizations(getLocMap("commands.help.names.subcmd.info"))
          .setDescription(tr.for("en-US", "commands.help.descriptions.subcmd.info"))
          .setDescriptionLocalizations(getLocMap("commands.help.descriptions.subcmd.info"))
      )
    );
  }

  //#region pb:run

  public async run(int: CommandInteraction, opt: CommandInteractionOption) {
    if(!HelpCmd.checkInGuild(int))
      return;

    switch(opt.name) {
    case "commands": {
      let cmdList = "";

      const hiddenCmds = new Set<string>();
      const showHidden = int.options.get("show_hidden")?.value as boolean ?? true;
      let ephemeral = false;

      const allowedCmds = [...cmdInstances.values()]
        .filter(cmd => {
          if(typeof cmd.builderJson.default_member_permissions === "undefined" || cmd.builderJson.default_member_permissions === "0")
            return true;
          if(typeof int.member?.permissions === "undefined")
            return false;

          const hasPerms = bitSetHas(BigInt(int.member.permissions as string), BigInt(cmd.builderJson.default_member_permissions as string));
          if(hasPerms) {
            ephemeral = true;
            showHidden && hiddenCmds.add(cmd.builderJson.name);
          }
          return showHidden ? hasPerms : false;
        })
        .sort((a, b) => a.builderJson.name.localeCompare(b.builderJson.name));

      if(!showHidden)
        ephemeral = false;

      for(const { builderJson: data } of allowedCmds)
        cmdList += `- ${hiddenCmds.has(data.name) ? "🔒 " : ""}\`/${data.name}\`${"description" in data ? `\n  ${data.description}` : ""}\n`;

      await int.deferReply({ ephemeral });
      const locale = await HelpCmd.getGuildLocale(int);

      return int.editReply(useEmbedify(cmdList, undefined, (e) => e
        .setTitle(tr.for(locale, "commands.help.embedTitles.commands"))
        .setFooter({ text: tr.for(locale, "commands.help.embedFooters.commands") }),
      ));
    }
    case "info": {
      await int.deferReply();
      const locale = await HelpCmd.getGuildLocale(int);

      const { version, author: { name, url }} = pkg;
      return int.editReply(useEmbedify([
        tr.for(locale, "commands.help.info.headline", { version, name, url }),
        tr.for(locale, "commands.help.info.donationLink", pkg.funding.url),
        "",
        tr.for(locale, "commands.help.info.bugsLink", pkg.bugs.url),
        tr.for(locale, "commands.help.info.supportServerLink", getEnvVar("SUPPORT_SERVER_INVITE_URL")),
        tr.for(locale, "commands.help.info.globalOptOut"),
        "",
        tr.for(locale, "commands.help.info.installExtensions"),
        tr.for(locale, "commands.help.info.installExtReturnYtDislike"),
        tr.for(locale, "commands.help.info.installExtSponsorBlock"),
        tr.for(locale, "commands.help.info.installExtDeArrow"),
        tr.for(locale, "commands.help.info.installExtMobile"),
        "",
        tr.for(locale, "commands.help.info.poweredBy"),
      ], undefined, (e) => e.setTitle(tr.for(locale, "commands.help.embedTitles.info"))));
    }
    }
  }
}
