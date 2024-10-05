import { getEnvVar } from "@lib/env.ts";
import type { RESTPostAPIChatInputApplicationCommandsJSONBody, SharedSlashCommand } from "discord.js";

const cmdPrefix = getEnvVar("CMD_PREFIX", "stringNoEmpty");

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
