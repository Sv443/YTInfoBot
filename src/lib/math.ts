import localesJson from "@assets/locales.json" with { type: "json" };
import type { NumberFormat } from "@cmd/VideoInfo.ts";

/** Formats a number with the given locale and format */
export function formatNumber(number: number, locale: (typeof localesJson)[number]["code"], format: NumberFormat): string {
  return number.toLocaleString(locale, format === "short"
    ? {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }
    : {
      style: "decimal",
      maximumFractionDigits: 0,
    }
  );
}

/** Checks if the given {@linkcode bitSet} contains the given {@linkcode checkVal} */
export function bitSetHas<TType extends number | bigint>(bitSet: TType, checkVal: TType): boolean {
  return (bitSet & checkVal) === checkVal;
}

/** Uses Math.round() at the given `dec`th decimal place, then divides by 10^dec to return to the original scale */
export function roundToDec(num: number, dec: number): number {
  const scale = 10 ** dec;
  return Math.round(num * scale) / scale;
}

/** Rounds the given values at the given decimal place and checks if they are within the given range (0.5 by default) */
export function valsWithin(a: number, b: number, dec = 10, within = 0.5): boolean {
  return Math.abs(roundToDec(a, dec) - roundToDec(b, dec)) <= within;
}
