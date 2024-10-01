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

/** Joins an array of strings with a separator and a last separator - defaults to `,` & `and` */
export function joinArrayReadable(array: unknown[], separators = ", ", lastSeparator = " and "): string {
  if(array.length === 0)
    return "";
  else if(array.length === 1)
    return String(array[0]);
  else if(array.length === 2)
    return array.join(lastSeparator);
  else {
    const lastItm = lastSeparator + array[array.length - 1];
    array.pop();
    return array.join(separators) + lastItm;
  }
}

/** Generates an ASCII progress bar with the given percentage and max length - uses opaque characters for extra detail */
export function generateProgressBar(percentage: number, maxLength: number) {
  const fullBlock = "█";
  const threeQuarterBlock = "▓";
  const halfBlock = "▒";
  const quarterBlock = "░";
  const emptyBlock = "─";

  // Calculate the number of fully filled characters
  const filledLength = Math.floor((percentage / 100) * maxLength);
  // Calculate the remaining percentage for the last character
  const remainingPercentage = (percentage / 100) * maxLength - filledLength;

  // Determine the character for the last partially filled block
  let lastBlock = "";
  if (remainingPercentage >= 0.75) {
    lastBlock = threeQuarterBlock;
  } else if (remainingPercentage >= 0.5) {
    lastBlock = halfBlock;
  } else if (remainingPercentage >= 0.25) {
    lastBlock = quarterBlock;
  }

  // Construct the progress bar
  const filledBar = fullBlock.repeat(filledLength);
  const emptyBar = emptyBlock.repeat(maxLength - filledLength - (lastBlock ? 1 : 0));

  return filledBar + lastBlock + emptyBar;
}

/** Converts seconds into the YouTube timestamp format (HH:)MM:SS */
export function secToYtTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours ? hours + ":" : ""}${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
