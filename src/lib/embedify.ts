import type { Stringifiable } from "@root/src/types.ts";
import { ColorResolvable, EmbedBuilder } from "discord.js";

/** Color constants for embeds */
export enum Col {
  Success = 0x1f8b4c,
  Error = 0xe34041,
  Warning = 0xc27c0e,
  Info = 0x3c4afc,
  Secondary = 0x99aad5,
}

/** Creates a simple EmbedBuilder with the given text and color */
export function embedify(text: Stringifiable | Stringifiable[], color: ColorResolvable = Col.Info): EmbedBuilder {
  const txt = String(Array.isArray(text) ? text.map(String).join("\n") : text);
  return new EmbedBuilder().setDescription(txt).setColor(color);
}

/**
 * Like {@linkcode embedify()}, but can be passed to or spread into a `int.reply()`, `msg.edit()`, etc.
 * @example ```ts
 * await msg.edit(useEmbedify("ayo?", 0xffabff));
 * await int.reply({ ...useEmbedify("waddup", undefined, (e) => e.setFooter({ text: "footer" })), ...Command.useButtons(btns), attachments: [...] });
 * ```
 */
export function useEmbedify(text: Stringifiable | Stringifiable[], color?: ColorResolvable, modify: (ebd: EmbedBuilder) => void = () => {}): { embeds: EmbedBuilder[] } {
  const ebd = embedify(text, color);
  modify?.(ebd);
  return { embeds: [ebd] };
}
