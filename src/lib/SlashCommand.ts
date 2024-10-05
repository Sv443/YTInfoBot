import type { AutocompleteInteraction, CommandInteraction, CommandInteractionOption, RESTPostAPIChatInputApplicationCommandsJSONBody, SharedSlashCommand } from "discord.js";
import { getEnvVar } from "@lib/env.ts";

const cmdPrefix = getEnvVar("CMD_PREFIX", "stringNoEmpty");

//#region CommandBase

export abstract class CommandBase {
  public readonly name: string;
  public readonly builder: SharedSlashCommand;
  public readonly builderJson: RESTPostAPIChatInputApplicationCommandsJSONBody;

  constructor(builder: SharedSlashCommand) {
    this.builder = builder;
    this.builderJson = builder.toJSON();
    this.name = builder.name;
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

/** Abstract class for creating slash commands */
export abstract class SlashCommand extends CommandBase {
  constructor(builder: SharedSlashCommand) {
    super(builder);
  }

  /** Gets executed when the command is run by a user */
  abstract run(int: CommandInteraction, opt?: CommandInteractionOption): Promise<void | unknown>;
}
