import { EventEmitter } from "node:events";
import type { CommandInteraction, CommandInteractionOption, RESTPostAPIChatInputApplicationCommandsJSONBody, SharedSlashCommand } from "discord.js";

export abstract class SlashCommand extends EventEmitter {
  public readonly name: string;
  public readonly builder: SharedSlashCommand;
  public readonly builderJson: RESTPostAPIChatInputApplicationCommandsJSONBody;

  constructor(builder: SharedSlashCommand) {
    super({ captureRejections: true });

    this.builder = builder;
    this.builderJson = builder.toJSON();
    this.name = builder.name;
  }

  abstract run(int: CommandInteraction, opt?: CommandInteractionOption): Promise<void | unknown>;
}
