import type { CommandInteraction, SharedSlashCommand } from "discord.js";
import { CommandBase } from "@lib/SlashCommand.ts";

/** Abstract class for creating commands that can be used in the context menu */
export abstract class ContextCommand extends CommandBase {
  constructor(builder: SharedSlashCommand) {
    super(builder);
  }

  /** Gets executed when the command is run by a user */
  abstract run(int: CommandInteraction): Promise<void | unknown>;
}
