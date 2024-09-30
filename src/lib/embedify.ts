import { ColorResolvable, Colors, EmbedBuilder } from "discord.js";

export enum EbdColors {
  Success = Colors.Green,
  Error = Colors.Red,
  Warning = Colors.Orange,
  Info = Colors.Blue,
  Default = EbdColors.Info,
  Secondary = Colors.Grey,
}

/** Creates a simple EmbedBuilder with the given text and color */
export function embedify(text: string, color: ColorResolvable = EbdColors.Default): EmbedBuilder {
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
