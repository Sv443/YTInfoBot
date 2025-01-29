import type { Stringifiable } from "@root/src/types.js";
import { type ColorResolvable, EmbedBuilder } from "discord.js";

/** Color constants for embeds */
export enum Col {
  Success = "#1f8b4c",
  Error = "#e34041",
  Warning = "#c27c0e",
  Info = "#6542ff",
  Secondary = "#99aad5",
}

/** Creates a simple EmbedBuilder with the given description text and color */
export function embedify(text: Stringifiable | Stringifiable[], color: ColorResolvable = Col.Info): EmbedBuilder {
  const txt = String(Array.isArray(text) ? text.map(String).join("\n") : text);
  return new EmbedBuilder().setDescription(txt).setColor(color);
}

/**
 * Like {@linkcode embedify()}, but can be passed to or spread into a `int.reply()`, `msg.edit()`, etc.  
 * The embed can also be further modified by passing a {@linkcode modify} function.
 * @example ```ts
 * await msg.edit(useEmbedify("ayo?", "#ffabff", (e) => e.setFooter({ text: "footer" })));
 * ```
 * @example ```ts
 * await int.reply({ ...useEmbedify("waddup", 0x1affe3), ...Command.useButtons(btns), content: "ello" });
 * ```
 */
export function useEmbedify(
  text: Stringifiable | Stringifiable[],
  color?: ColorResolvable,
  modify: (ebd: EmbedBuilder) => void = () => {}
): { embeds: EmbedBuilder[] } {
  const ebd = embedify(text, color);
  modify?.(ebd);
  return { embeds: [ebd] };
}
