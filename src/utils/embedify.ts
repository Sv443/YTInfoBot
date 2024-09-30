import { ColorResolvable, EmbedBuilder } from "discord.js";

export function embedify(text: string, color: ColorResolvable = "DarkRed"): EmbedBuilder {
  return new EmbedBuilder()
    .setDescription(text).setColor(color);
}

/**
 * Like embedify, but can be spread onto a `int.reply()` or `msg.edit()` etc.
 * @example ```ts
 * await int.reply({ ...useEmbedify("helo"), ...Command.useButtons(btns), attachments: [...] });
 * await msg.edit(useEmbedify("helo"));
 * ```
 */
export function useEmbedify(text: string, color?: ColorResolvable)
{
  return { embeds: [ embedify(text, color) ]};
}
