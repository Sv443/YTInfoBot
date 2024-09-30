import type { RESTPostAPIChatInputApplicationCommandsJSONBody, SharedSlashCommand } from "discord.js";

export abstract class CommandBase {
  public readonly name: string;
  public readonly builder: SharedSlashCommand;
  public readonly builderJson: RESTPostAPIChatInputApplicationCommandsJSONBody;

  constructor(builder: SharedSlashCommand) {
    this.builder = builder;
    this.builderJson = builder.toJSON();
    this.name = builder.name;
  }
}
