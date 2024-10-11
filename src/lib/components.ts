import { ActionRowBuilder, ButtonBuilder } from "discord.js";

/**
 * Returns an object from passed buttons that can be spread onto an interaction reply.  
 * Returns an empty object if no buttons were passed, so it's always safe to spread.
 * @example ```ts
 * await int.reply({ ...Command.useButtons(btns), content: "foo" });
 * ```
 */
export function useButtons(buttons?: ButtonBuilder | ButtonBuilder[][]) {
  const actRows = Array.isArray(buttons) ? buttons : (buttons ? [[buttons]] : []);
  const rows: ActionRowBuilder<ButtonBuilder>[] = actRows.map(row => new ActionRowBuilder<ButtonBuilder>().setComponents(row));

  return rows.length > 0 ? { components: rows } : {};
}
