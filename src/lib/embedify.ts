import type { Stringifiable } from "@root/src/types.ts";
import { ColorResolvable, Colors, EmbedBuilder } from "discord.js";

export enum Col {
  Success = Colors.Green,
  Error = Colors.Red,
  Warning = Colors.Orange,
  Info = Colors.Blue,
  Secondary = Colors.Greyple,
}

/** Creates a simple EmbedBuilder with the given text and color */
export function embedify(text: Stringifiable | Stringifiable[], color: ColorResolvable = Col.Info): EmbedBuilder {
  const t = Array.isArray(text) ? text.map(String).join("\n") : text;
  return new EmbedBuilder()
    .setDescription(String(t)).setColor(color);
}

/**
 * Like {@linkcode embedify()}, but can be passed to or spread into a `int.reply()`, `msg.edit()`, etc.
 * @example ```ts
 * await msg.edit(useEmbedify("ayo?"));
 * await int.reply({ ...useEmbedify("waddup"), ...Command.useButtons(btns), attachments: [...] });
 * ```
 */
export function useEmbedify(text: Stringifiable | Stringifiable[], color?: ColorResolvable) {
  return { embeds: [ embedify(text, color) ]};
}
