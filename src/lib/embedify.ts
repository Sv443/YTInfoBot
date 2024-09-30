import { ColorResolvable, EmbedBuilder } from "discord.js";

/** Creates a simple EmbedBuilder with the given text and color */
export function embedify(text: string, color: ColorResolvable = "DarkRed"): EmbedBuilder {
  return new EmbedBuilder()
    .setDescription(text).setColor(color);
}

/**
 * Like {@linkcode embedify()}, but can be passed to or spread into a `int.reply()`, `msg.edit()`, etc.
 * @example ```ts
 * await msg.edit(useEmbedify("ayo?"));
 * await int.reply({ ...useEmbedify("waddup"), ...Command.useButtons(btns), attachments: [...] });
 * ```
 */
export function useEmbedify(text: string, color?: ColorResolvable) {
  return { embeds: [ embedify(text, color) ]};
}
