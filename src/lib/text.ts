import { Collection } from "discord.js";

/** Capitalizes the first letter of a string */
export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Truncates a string if it exceeds `length` and inserts `endStr` at the end (empty string to disable) */
export function truncStr(str: string, length: number, endStr = "...") {
  return str.length > length ? str.substring(0, length) + endStr : str;
}

/** Truncates a string for use in an EmbedBuilder field (max length = 1024) */
export function truncField(content: string, endStr = "...") {
  return truncStr(content, 1024 - endStr.length, endStr);
}

/**
 * Automatically appends an `s` to the passed `word`, if `num` is not equal to 1.  
 * This doesn't work for all words, but it's a simple and dynamic way to handle most cases.
 * @param word A word in singular form, to auto-convert to plural
 * @param num If this is an array, the amount of items is used
 */
export function autoPlural(word: string, num: number | unknown[] | Collection<unknown, unknown>) {
  if(Array.isArray(num))
    num = num.length;
  else if(num instanceof Collection)
    num = num.size;
  return `${word}${num === 1 ? "" : "s"}`;
}
