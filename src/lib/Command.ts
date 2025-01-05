import type { AutocompleteInteraction, CommandInteraction, CommandInteractionOption, ContextMenuCommandBuilder, RESTPostAPIChatInputApplicationCommandsJSONBody, RESTPostAPIContextMenuApplicationCommandsJSONBody, SharedSlashCommand } from "discord.js";
import { getEnvVar } from "@lib/env.ts";
import { Col, useEmbedify } from "@lib/embedify.ts";
import { defaultLocale, tr } from "@lib/translate.ts";
import { em } from "@lib/db.ts";
import { GuildConfig } from "@models/GuildConfig.model.ts";
import k from "kleur";

const cmdPrefix = getEnvVar("CMD_PREFIX", "stringOrUndefined");

//#region CmdBase

/** Abstract base class for all types of commands */
export abstract class CmdBase {
  /** Name of the command */
  public readonly name: string;
  /** Whether commands are global or guild commands */
  static readonly global = false;
  /** Prefix for all commands - undefined if `CMD_PREFIX` env var is not set */
  static readonly cmdPrefix = cmdPrefix;
  /** Type of the cmd instance */
  public abstract readonly type: "slash" | "ctx";

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Returns the command name, optionally prefixed by the env var `CMD_PREFIX`  
   * ⚠️ Only use at the top level, not in subcommands!  
   * If no name is passed, returns only the prefix, or an empty string if none is set
   */
  public static getCmdName(name?: string) {
    return `${cmdPrefix ?? ""}${name ?? ""}`;
  }

  /** Checks whether the passed interaction is in a guild and replies or edits the reply with an error message if not */
  public static checkInGuild(int: CommandInteraction): int is CommandInteraction<"raw" | "cached"> {
    if(!int.inGuild()) {
      int[int.deferred || int.replied ? "editReply" : "reply"](useEmbedify(tr.for("en-US", "errors.onlyRunInGuild"), Col.Error));
      return false;
    }
    return true;
  }

  /** Returns the locale of the guild for the given interaction or guild ID */
  public static async getGuildLocale(intOrId: Pick<CommandInteraction, "guild" | "guildId"> | string): Promise<string> {
    return (await em.findOne(GuildConfig, { id: typeof intOrId === "string" ? intOrId : intOrId.guild?.id ?? intOrId?.guildId }))?.locale ?? defaultLocale;
  }
}

//#region SlashCommand

export interface SlashCommand extends CmdBase {
  /** Optional method used in autocomplete interactions */
  autocomplete?(int: AutocompleteInteraction, opt?: CommandInteractionOption): Promise<void | unknown>;
}

/** Abstract base class for creating slash commands */
export abstract class SlashCommand extends CmdBase {
  public readonly builder: SharedSlashCommand;
  public readonly builderJson: RESTPostAPIChatInputApplicationCommandsJSONBody;
  public readonly type = "slash";

  constructor(builder: SharedSlashCommand) {
    super(builder.name);

    this.builder = builder;
    this.builderJson = builder.toJSON();

    // check if any subcommand has the command prefix and throw error
    if(cmdPrefix) {
      const errors = [] as string[];
      for(const sub of this.builderJson.options ?? []) {
        if(sub.name.startsWith(cmdPrefix))
          errors.push(`Subcommand name "${sub.name}" cannot start with the command prefix "${cmdPrefix}"`);
      }
      if(errors.length > 0)
        throw new Error(`${k.red(`Encountered ${errors.length === 1 ? "error" : "errors"} while creating slash command instance "${this.constructor.name}":`)}\n${errors.join("\n")}`);
    }
  }

  /** Gets executed when the command is run by a user */
  abstract run(int: CommandInteraction, opt?: CommandInteractionOption): Promise<void | unknown>;
}

//#region CtxCommand

/** Abstract base class for creating commands that can be used in the context menu */
export abstract class ContextCommand extends CmdBase {
  public readonly builder: ContextMenuCommandBuilder;
  public readonly builderJson: RESTPostAPIContextMenuApplicationCommandsJSONBody;
  public readonly type = "ctx";

  constructor(builder: ContextMenuCommandBuilder) {
    super(builder.name);

    this.builder = builder;
    this.builderJson = builder.toJSON();
  }

  /** Gets executed when the command is run by a user */
  abstract run(int: CommandInteraction): Promise<void | unknown>;
}
