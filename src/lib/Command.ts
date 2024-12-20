import type { AutocompleteInteraction, CommandInteraction, CommandInteractionOption, ContextMenuCommandBuilder, RESTPostAPIChatInputApplicationCommandsJSONBody, RESTPostAPIContextMenuApplicationCommandsJSONBody, SharedSlashCommand } from "discord.js";
import { getEnvVar } from "@lib/env.ts";

const cmdPrefix = getEnvVar("CMD_PREFIX", "stringNoEmpty");

//#region CmdBase

/** Abstract base class for all types of commands */
export abstract class CmdBase {
  /** Name of the command */
  public readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Returns the command name, optionally prefixed by the env var `CMD_PREFIX`  
   * If no name is passed, returns only the prefix, or an empty string if none is set
   */
  public static getCmdName(name?: string) {
    return `${cmdPrefix ?? ""}${name ?? ""}`;
  }
}

//#region SlashCommand

export interface SlashCommand {
  /** Optional method used in autocomplete interactions */
  autocomplete?(int: AutocompleteInteraction, opt?: CommandInteractionOption): Promise<void | unknown>;
}

/** Abstract base class for creating slash commands */
export abstract class SlashCommand extends CmdBase {
  public readonly builder: SharedSlashCommand;
  public readonly builderJson: RESTPostAPIChatInputApplicationCommandsJSONBody;

  constructor(builder: SharedSlashCommand) {
    super(builder.name);

    this.builder = builder;
    this.builderJson = builder.toJSON();
  }

  /** Gets executed when the command is run by a user */
  abstract run(int: CommandInteraction, opt?: CommandInteractionOption): Promise<void | unknown>;
}

//#region CtxCommand

/** Abstract base class for creating commands that can be used in the context menu */
export abstract class ContextCommand extends CmdBase {
  public readonly builder: ContextMenuCommandBuilder;
  public readonly builderJson: RESTPostAPIContextMenuApplicationCommandsJSONBody;

  constructor(builder: ContextMenuCommandBuilder) {
    super(builder.name);

    this.builder = builder;
    this.builderJson = builder.toJSON();
  }

  /** Gets executed when the command is run by a user */
  abstract run(int: CommandInteraction): Promise<void | unknown>;
}
