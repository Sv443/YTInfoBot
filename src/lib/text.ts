import { Collection } from "discord.js";
import emojis from "@assets/emojis.json" with { type: "json" };

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
 * @param num If this is an array, d.js Collection or Map, the amount of items is used
 */
export function autoPlural(word: string, num: number | unknown[] | Collection<unknown, unknown> | Map<unknown, unknown>) {
  if(Array.isArray(num))
    num = num.length;
  else if(num instanceof Collection || num instanceof Map)
    num = num.size;
  return `${word}${num === 1 ? "" : "s"}`;
}

/** Joins an array of strings with a separator and a last separator - defaults to `,` & `and` */
export function joinArrayReadable(array: unknown[], separators = ", ", lastSeparator = " and "): string {
  const arr = [...array];
  if(arr.length === 0)
    return "";
  else if(arr.length === 1)
    return String(arr[0]);
  else if(arr.length === 2)
    return arr.join(lastSeparator);

  const lastItm = lastSeparator + arr[arr.length - 1];
  arr.pop();
  return arr.join(separators) + lastItm;
}

/** Generates an ASCII progress bar with the given percentage and max length - uses opaque characters for extra detail */
export function generateAsciiProgressBar(percentage: number, maxLength: number) {
  const fullBlock = "█";
  const threeQuarterBlock = "▓";
  const halfBlock = "▒";
  const quarterBlock = "░";
  const emptyBlock = "─";

  const filledLength = Math.floor((percentage / 100) * maxLength);
  const remainingPercentage = (percentage / 100) * maxLength - filledLength;

  let lastBlock = "";
  if(remainingPercentage >= 0.75)
    lastBlock = threeQuarterBlock;
  else if(remainingPercentage >= 0.5)
    lastBlock = halfBlock;
  else if (remainingPercentage >= 0.25)
    lastBlock = quarterBlock;

  const filledBar = fullBlock.repeat(filledLength);
  const emptyBar = emptyBlock.repeat(maxLength - filledLength - (lastBlock ? 1 : 0));

  return `${filledBar}${lastBlock}${emptyBar}`;
}

/**
 * Generates a progress bar out of emojis with the given percentage and max length.  
 * The bar is made out of 3 emoji types: left end, middle, and right end.  
 * Each piece is divided into quarters and an empty space, in total ranging from 0 to 4.
 */
export function generateEmojiProgressBar(percentage: number, maxLength: number) {
  const getEmoji = (x: "L" | "M" | "R", y: 0 | 1 | 2 | 3 | 4) => getEmojiStr(emojis[`PB_${x}_${y}`]);

  /**
   * Figures out which amount of the bar is filled at the given position of the bar, which has the absolute float value from`percentage` from 0.0 to 100.0  
   * The bar is of integer length `maxLength` and `pos` is an integer index within that range.  
   * Has to return one of 0.0, 0.25, 0.5, 0.75 or 1.0
   */
  const getFractionAtPos = (pos: number): 0.0 | 0.25 | 0.5 | 0.75 | 1.0 => {
    const filledLength = (percentage / 100) * maxLength;
    const remainingFraction = filledLength - pos;

    if(pos <= filledLength - 1)
      return 1.0;
    else if(remainingFraction >= 0 && remainingFraction < 1)
      return remainingFraction >= 0.75
        ? 0.75
        : remainingFraction >= 0.5
          ? 0.5
          : remainingFraction >= 0.25
            ? 0.25
            : 0.0;
    else
      return 0.0;
  };

  const idxArr = Array.from({ length: maxLength }, (_, i) => i);
  const pbNumbers = idxArr.map(v => getFractionAtPos(v) / 0.25);
  const pbEmojis = [
    getEmoji("L", pbNumbers[0] as 0),
    ...idxArr.slice(1, -1).map(v => getEmoji("M", pbNumbers[v] as 0)),
    getEmoji("R", pbNumbers[maxLength - 1] as 0),
  ];

  return pbEmojis.join("");
}

/** Returns the emoji string for the given emoji name or ID */
export function getEmojiStr(emojiNameOrId: keyof typeof emojis | (string & {})) {
  const em = Object.entries(emojis).find(([name, id]) => id === emojiNameOrId || name === emojiNameOrId);
  if(em)
    return `<:${em[0]}:${em[1]}>`;
  return emojiNameOrId;
}

/** Converts seconds into the YT timestamp format `(hh:)mm:ss` */
export function secsToYtTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours ? hours + ":" : ""}${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
