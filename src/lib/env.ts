import type { Stringifiable } from "@src/types.js";
import "dotenv/config";

/**
 * Grabs an environment variable's value, and casts it to a `string` (or what's passed in the TRetVal generic).  
 * However if the string is empty (or unset), undefined is returned.
 */
export function getEnvVar(varName: string, asType?: "stringOrUndefined"): string | undefined
/** Grabs an environment variable's value, and casts it to a `string` (or what's passed in the TRetVal generic) */
export function getEnvVar(varName: string, asType: "string"): string
/** Grabs an environment variable's value, and casts it to a `number` (or what's passed in the TRetVal generic) */
export function getEnvVar(varName: string, asType: "number"): number
/** Grabs an environment variable's value, and casts it to a `string[]` (or what's passed in the TRetVal generic) */
export function getEnvVar(varName: string, asType: "stringArray"): string[]
/** Grabs an environment variable's value, and casts it to a `number[]` (or what's passed in the TRetVal generic) */
export function getEnvVar(varName: string, asType: "numberArray"): number[]
/** Grabs an environment variable's value, and casts it to a specific type (stringOrUndefined by default) */
export function getEnvVar<
  T extends ("string" | "number" | "stringArray" | "numberArray" | "stringOrUndefined")
>(
  varName: string,
  asType: T = "stringOrUndefined" as T
): undefined | (string | number | string[] | number[]) {
  const val = String(process.env[varName] ?? "").trim();
  const commasRegex = /[,،，٫٬]/g;

  switch(asType) {
  default:
  case "stringOrUndefined":
    return val.length === 0 ? undefined : val;
  case "string":
    return val;
  case "number":
    return Number(val);
  case "stringArray":
    return val.split(commasRegex);
  case "numberArray":
    return val.split(commasRegex).map(n => Number(n.trim()));
  }
}

/**
 * Tests if the value of the environment variable {@linkcode varName} equals {@linkcode compareValue} casted to string.  
 * Set {@linkcode caseSensitive} to true to make the comparison case-sensitive.
 */
export function envVarEq(varName: string, compareValue: Stringifiable, caseSensitive = false) {
  const envVal = (caseSensitive ? getEnvVar(varName) : getEnvVar(varName)?.toLowerCase());
  const compVal = (caseSensitive ? String(compareValue) : String(compareValue).toLowerCase());
  return envVal === compVal;
}
