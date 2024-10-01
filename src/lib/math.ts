import localesJson from "@assets/locales.json" with { type: "json" };
import type { NumberFormat } from "@cmd/VideoInfo.ts";

/** Formats a number with the given locale and format */
export function formatNumber(number: number, locale: (typeof localesJson)[number]["code"], format: NumberFormat): string {
  return new Intl.NumberFormat(locale, format === "short"
    ? {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }
    : {
      style: "decimal",
      maximumFractionDigits: 0,
    }
  ).format(number);
}
