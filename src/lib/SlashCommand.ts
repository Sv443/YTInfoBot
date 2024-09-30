import { CommandBase } from "@/lib/Command.ts";
import type { AutocompleteInteraction, CommandInteraction, CommandInteractionOption, SharedSlashCommand } from "discord.js";

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
