import { tr } from "@lib/translate.js";
import emojis from "@assets/emojis.json" with { type: "json" };
import type { ListLike, Stringifiable } from "@src/types.js";

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
 * Automatically pluralizes the given string an `-s` or `-ies` to the passed {@linkcode term}, if {@linkcode num} is not equal to 1.  
 * By default, words ending in `-y` will have it replaced with `-ies`, and all other words will simply have `-s` appended.  
 * If {@linkcode num} resolves to NaN or the {@linkcode pluralType} is wrong, it defaults to the {@linkcode pluralType} `auto` and sets {@linkcode num} to 2.
 * @param term The term, written in singular form, to auto-convert to plural form
 * @param num A number, or list-like value that has either a `length`, `count` or `size` property, like an array, Map or discord.js Collection - does not support iterables, they need to be converted to an array first
 * @param pluralType Which plural form to use when auto-pluralizing. Defaults to `"auto"`, which removes the last char and uses `-ies` for words ending in `y` and simply appends `-s` for all other words
 */
export function autoPlural(term: Stringifiable, num: number | ListLike, pluralType: "auto" | "-s" | "-ies" = "auto"): string {
  if(typeof num !== "number") {
    if("length" in num)
      num = num.length;
    else if("size" in num)
      num = num.size;
    else if("count" in num)
      num = num.count;
  }

  if(!["-s", "-ies"].includes(pluralType))
    pluralType = "auto";

  if(isNaN(num))
    num = 2;

  const pType: "-s" | "-ies" = pluralType === "auto"
    ? String(term).endsWith("y") ? "-ies" : "-s"
    : pluralType;

  switch(pType) {
  case "-s":
    return `${term}${num === 1 ? "" : "s"}`;
  case "-ies":
    return `${String(term).slice(0, -1)}${num === 1 ? "y" : "ies"}`;
  default:
    return String(term);
  }
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
export function generateAsciiProgressBar(percentage: number, barLength: number) {
  const fullBlock = "█";
  const threeQuarterBlock = "▓";
  const halfBlock = "▒";
  const quarterBlock = "░";
  const emptyBlock = "─";
  
  if(percentage === 100)
    return fullBlock.repeat(barLength);

  const filledLength = Math.floor((percentage / 100) * barLength);
  const remainingPercentage = percentage / 10 * barLength - filledLength;

  let lastBlock = "";
  if(remainingPercentage >= 0.75)
    lastBlock = threeQuarterBlock;
  else if(remainingPercentage >= 0.5)
    lastBlock = halfBlock;
  else if (remainingPercentage >= 0.25)
    lastBlock = quarterBlock;

  const filledBar = fullBlock.repeat(filledLength);
  const emptyBar = emptyBlock.repeat(barLength - filledLength - (lastBlock ? 1 : 0));

  return `${filledBar}${lastBlock}${emptyBar}`;
}

/**
 * Generates a progress bar out of emojis with the given percentage and max length.  
 * The bar is made out of 3 emoji types: left end, middle, and right end.  
 * Each piece is divided into quarters and an empty space, in total ranging from 0 to 4.
 */
export function generateEmojiProgressBar(percentage: number, maxLength: number) {
  const getEmoji = (part: "L" | "M" | "R", fillIdx: 0 | 1 | 2 | 3 | 4) => emoji(emojis[`PB_${part}_${fillIdx}`]);

  /**
   * Figures out which amount of the bar is filled at the given position of the bar, which has the absolute float value from`percentage` from 0.0 to 100.0  
   * The bar is of integer length `maxLength` and `pos` is an integer index within that range.  
   * @returns one of 0.0, 0.25, 0.5, 0.75 or 1.0
   */
  const getFractionAtPos = (pos: number): 0.0 | 0.25 | 0.5 | 0.75 | 1.0 => {
    const filledLength = (percentage / 100) * maxLength;
    const remainingFraction = filledLength - pos;

    if(pos <= filledLength - 1)
      return 1.0;
    else if(remainingFraction >= 0 && remainingFraction < 1)
      return ([0.75, 0.5, 0.25].find(v => remainingFraction >= v) as 0.75 | 0.5 | 0.25) ?? 0.0;
    else
      return 0.0;
  };

  const idxArr = Array.from({ length: maxLength }, (_, i) => i);
  // get fraction at each emoji index and convert it to a number from 0 to 4
  const pbNumbers = idxArr.map(v => getFractionAtPos(v) / 0.25);
  const pbEmojis = [
    getEmoji("L", pbNumbers[0] as 0),
    ...idxArr.slice(1, -1).map(v => getEmoji("M", pbNumbers[v] as 0)),
    getEmoji("R", pbNumbers[maxLength - 1] as 0),
  ];

  return pbEmojis.join("");
}

/** Returns the emoji string for the given emoji name or ID */
export function emoji(emojiNameOrId: keyof typeof emojis | (string & {}) | (number & {})) {
  const em = Object.entries(emojis).find(([name, id]) => id === String(emojiNameOrId) || name === String(emojiNameOrId));
  if(em)
    return `<:${em[0]}:${em[1]}>`;
  return `:${emojiNameOrId}:`;
}

/** Converts seconds into the YT timestamp format `(hh:)mm:ss` */
export function secsToYtTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours ? hours + ":" : ""}${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/** Returns the passed amount of seconds in a human-readable format */
export function secsToTimeStr(seconds: number, locale = "en-US", padded = true) {
  const t = tr.use(locale);

  const d = Math.floor(seconds / (60 * 60 * 24)),
    h = Math.floor(seconds / (60 * 60)) % 24,
    m = Math.floor(seconds / 60) % 60,
    s = Math.floor(seconds) % 60;

  const pad = (n: number) => padded && n !== 0 ? String(n).padStart(2, "0") : n;

  return ([
    [(60 * 60 * 24), `${d}${t("general.time.short.days")}`],
    [(60 * 60), `${seconds >= (60 * 60 * 24) ? pad(h) : h}${t("general.time.short.hours")}`],
    [60, `${seconds >= (60 * 60) ? pad(m) : m}${t("general.time.short.minutes")}`],
    [0, `${seconds >= 60 ? pad(s) : s}${t("general.time.short.seconds")}`],
  ] as const)
    .filter(([d]) => seconds >= d)
    .map(([, s]) => s)
    .join(" ");
}
