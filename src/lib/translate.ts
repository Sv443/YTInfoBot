import type { Stringifiable } from "@src/types.ts";
import type { LocalizationMap } from "discord.js";
import k from "kleur";
import { readdir, readFile } from "node:fs/promises";

//#region tr system

/**
 * Translation object to pass to {@linkcode tr.addTranslations()}  
 * Can be a flat object of identifier keys and the translation text as the value, or an infinitely nestable object containing the same.  
 *   
 * @example
 * // Flat object:
 * const tr_en: TrObject = {
 *   hello: "Hello, %1!",
 *   foo: "Foo",
 * };
 * 
 * // Nested object:
 * const tr_de: TrObject = {
 *   hello: "Hallo, %1!",
 *   foo: {
 *     bar: "Foo bar",
 *   },
 * };
 */
export interface TrObject {
 [key: string]: string | TrObject;
}

/** Function that transforms a matched translation string into something else */
export type TransformFn = (matches: RegExpMatchArray, language: string, ...args: (Stringifiable | Record<string, Stringifiable>)[]) => Stringifiable;

/** All translations loaded into memory */
const trans: {
 [language: string]: TrObject;
} = {};

/** All registered value transformers */
const valTransforms: Array<{
 regex: RegExp;
 fn: (matches: RegExpMatchArray, language: string) => Stringifiable;
}> = [];

/** Currently set language */
let curLang = "";

/** Common function to resolve the translation text in a specific language. */
function translate(language: string, key: string, ...args: (Stringifiable | Record<string, Stringifiable>)[]): string {
  if(typeof language !== "string")
    language = curLang ?? "";

  const trObj = trans[language];

  if(typeof language !== "string" || language.length === 0 || typeof trObj !== "object" || trObj === null)
    return key;

  const transform = (value: string): string => {
    const tf = valTransforms.find((t) => t.regex.test(value));

    return tf
      ? value.replace(tf.regex, (...matches) => String(tf.fn(matches, language)))
      : value;
  };

  // try to resolve via traversal (e.g. `trObj["key"]["parts"]`)
  const keyParts = key.split(".");
  let value: string | TrObject | undefined = trObj;
  for(const part of keyParts) {
    if(typeof value !== "object" || value === null)
      break;
    value = value?.[part];
  }
  if(typeof value === "string")
    return transform(insertValues(value, args));

  // try falling back to `trObj["key.parts"]`
  value = trObj?.[key];
  if(typeof value === "string")
    return transform(insertValues(value, args));

  // default to translation key
  return key;
}

/**
 * Inserts the passed values into a string at the respective placeholders.  
 * The placeholder format is `%n`, where `n` is the 1-indexed argument number.
 * @param input The string to insert the values into
 * @param values The values to insert, in order, starting at `%1`
 */
function insertValues(input: string, ...values: (Stringifiable | Record<string, Stringifiable>)[]): string {
  return input.replace(/%\d/gm, (match) => {
    const argIndex = Number(match.substring(1)) - 1;
    return (values[argIndex] ?? match)?.toString();
  });
}

// /**
//  * Returns the translated text for the specified key in the specified language.  
//  * If the key is not found in the specified previously registered translation, the key itself is returned.  
//  *   
//  * ⚠️ Remember to register a language with {@linkcode tr.addTranslations()} before using this function, otherwise it will always return the key itself.
//  * @param language Language code or name to use for the translation
//  * @param key Key of the translation to return
//  * @param args Optional arguments to be passed to the translated text. They will replace placeholders in the format `%n`, where `n` is the 1-indexed argument number
//  */
// const forLang = translate;

/**
 * Registers a new language and its translations - if the language already exists, it will be overwritten.  
 * The translations are a key-value pair where the key is the translation key and the value is the translated text.  
 *   
 * The translations can contain placeholders in the format `%n`, where `n` is the 1-indexed argument number.  
 * These placeholders will be replaced by the arguments passed to the translation functions.  
 * @param language Language code or name to register
 * @param translations Translations for the specified language
 * @example ```ts
 * tr.addTranslations("en", {
 *   hello: "Hello, %1!",
 *   foo: {
 *     bar: "Foo bar",
 *   },
 * });
 * ```
 */
const addTranslations = (language: string, translations: TrObject): void => {
  trans[language] = JSON.parse(JSON.stringify(translations));
};

/**
 * Sets the active language for the translation functions.  
 * This language will be used by the {@linkcode tr()} function to return the translated text.  
 * If the language is not registered with {@linkcode tr.addTranslations()}, the translation functions will always return the key itself.  
 * @param language Language code or name to set as active
 */
const setLanguage = (language: string): void => {
  curLang = language;
};

/**
 * Returns the active language set by {@linkcode tr.setLanguage()}  
 * If no language is set, this function will return `undefined`.  
 * @returns Active language code or name
 */
const getLanguage = (): string => curLang;

/**
 * Returns the translation object for the specified language or currently active one.  
 * If the language is not registered with {@linkcode tr.addTranslations()}, this function will return `undefined`.  
 * @param language Language code or name to get translations for - defaults to the currently active language (set by {@linkcode tr.setLanguage()})
 * @returns Translations for the specified language
 */
const getTranslations = (language = curLang): TrObject | undefined => trans[language];

/**
 * Deletes the translations for the specified language from memory.  
 * @param language Language code or name to delete
 */
const deleteTranslations = (language = curLang): void => {
  delete trans[language];
};

/**
 * Checks if a translation exists given its {@linkcode key} in the specified {@linkcode language} or else the currently active one.  
 * If the language is not registered with {@linkcode tr.addTranslations()}, this function will return `false`.  
 * @param key Key of the translation to check for
 * @param language Language code or name to check in - defaults to the currently active language (set by {@linkcode tr.setLanguage()})
 * @returns Whether the translation key exists in the specified language - always returns `false` if no language is given and no active language was set
 */
const hasKey = (key: string, language = curLang): boolean => {
  return tr.forLang(language, key) !== key;
};

/**
 * Adds a transform function that gets called after resolving a translation for any language.  
 * Use it to enable dynamic values in translations, for example to insert custom global values from the application or to denote a section that could be encapsulated by rich text.  
 * Each function will receive the RegExpMatchArray [see MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match) and the current language as arguments.  
 * After all %n-formatted values have been injected, the transform functions will be called sequentially in the order they were added.
 * @example
 * ```ts
 * tr.addTranslations("en", {
 *    "greeting": {
 *      "with_username": "Hello, <$USERNAME>",
 *      "headline_html": "Hello, <$USERNAME><br><c=red>You have <$UNREAD_NOTIFS> unread notifications.</c>"
 *    }
 * });
 * 
 * // replace <$PATTERN>
 * tr.addTransform(/<\$([A-Z_]+)>/g, (matches: RegExpMatchArray, language: string) => {
 *   switch(matches?.[1]) {
 *     default: return "<UNKNOWN_PATTERN>";
 *     // these would be grabbed from elsewhere in the application:
 *     case "USERNAME": return "JohnDoe45";
 *     case "UNREAD_NOTIFS": return 5;
 *   }
 * });
 * 
 * // replace <c=red>...</c> with <span class="color red">...</span>
 * tr.addTransform(/<c=([a-z]+)>(.*?)<\/c>/g, (matches: RegExpMatchArray, language: string, ...args: (Stringifiable | Record<string, Stringifiable>)[]) => {
 *   const color = matches?.[1];
 *   const content = matches?.[2];
 * 
 *   return "<span class=\"color " + color + "\">" + content + "</span>";
 * });
 * 
 * tr.setLanguage("en");
 * 
 * tr("greeting.with_username"); // "Hello, JohnDoe45"
 * tr("greeting.headline"); // "<b>Hello, JohnDoe45</b>\nYou have 5 unread notifications."
 * ```
 * @param pattern Regular expression or string (passed to `new RegExp(pattern, "gm")`) that should match the entire pattern that calls the transform function
 */
const addTransform = (pattern: RegExp | string, fn: TransformFn): void => {
  valTransforms.push({ fn, regex: typeof pattern === "string" ? new RegExp(pattern, "gm") : pattern });
};

/**
 * Deletes the first transform function from the list of registered transform functions.  
 * @param patternOrFn A reference to the regular expression of the transform function, a string matching the original pattern, or a reference to the transform function to delete
 */
const deleteTransform = (patternOrFn: RegExp | string | TransformFn): void => {
  const idx = valTransforms.findIndex((t) =>
    (t.fn === patternOrFn as unknown as () => void)
    || (t.regex === (typeof patternOrFn === "string" ? new RegExp(patternOrFn, "gm") : patternOrFn))
  );
  idx !== -1 && valTransforms.splice(idx, 1);
};

// TODO: #DBG
// /**
//  * Returns the translated text for the specified key in the current language set by {@linkcode tr.setLanguage()}  
//  * Use {@linkcode tr.forLang()} to get the translation for a specific language instead of the currently set one.  
//  * If the key is not found in the currently set language, the key itself is returned.  
//  *   
//  * ⚠️ Remember to register a language with {@linkcode tr.addTranslations()} and set it as active with {@linkcode tr.setLanguage()} before using this function, otherwise it will always return the key itself.
//  * @param key Key of the translation to return
//  * @param args Optional arguments to be passed to the translated text. They will replace placeholders in the format `%n`, where `n` is the 1-indexed argument number
//  */
// const tr = (key: string, ...args: (Stringifiable | Record<string, Stringifiable>)[]): string => translate(curLang, key, ...args);

/**
 * Returns the translated text for the specified key in the specified language.  
 * If the key is not found in the specified previously registered translation, the key itself is returned.  
 *   
 * ⚠️ Remember to register a language with {@linkcode tr.addTranslations()} before using this function, otherwise it will always return the key itself.
 * @param language Language code or name to use for the translation
 * @param key Key of the translation to return
 * @param args Optional arguments to be passed to the translated text. They will replace placeholders in the format `%n`, where `n` is the 1-indexed argument number
 */
const forLang = (language: string, key: string, ...args: (Stringifiable | Record<string, Stringifiable>)[]) => {
  const txt = translate(language, key, ...args);
  if(txt === key)
    return translate(defaultLocale, key, ...args);
  return txt;
};

const tr = {
  forLang,
  addTranslations,
  setLanguage,
  getLanguage,
  getTranslations,
  deleteTranslations,
  hasKey,
  addTransform,
  deleteTransform,
};

export { tr };

//#region custom stuff

export const defaultLocale = "en-US";

/** Array of tuples containing the regular expression and the transformation function */
const transforms = [
  [
    /<\$([a-zA-Z0-9$_-]+)>/gm,
    // TODO: verify
    (matches, _lang, ...args) => {
      let str = matches[1];
    
      const eachKeyInTrString = (keys: string[]) => keys.every((key) => matches[1].includes(`<$${key}>`));
    
      const namedMapping = () => {
        if(!str.includes("<$") || !args[0] || typeof args[0] !== "object" || !eachKeyInTrString(Object.keys(args[0])))
          return;
        for(const key in args[0]) {
          const regex = new RegExp(`<\\$${key}>`, "gm");
          str = str.replace(regex, String((args[0] as Record<string, string>)[key]));
        }
      };
    
      const positionalMapping = () => {
        if(!str.includes("<$"))
          return;
        for(const arg of args)
          str = str.replace(/<\$[a-zA-Z0-9$_-]+>/, String(arg));
      };
    
      if(args[0] && typeof args[0] === "object" && !("toString" in args[0]))
        if(eachKeyInTrString(Object.keys(args[0])))
          namedMapping();
      positionalMapping();
    
      return str;
    },
  ],
] as const satisfies [RegExp, TransformFn][];

/** Loads all translations from files in the folder at `src/assets/translations` and applies transformation functions */
export async function initTranslations(): Promise<void> {
  const files = await readdir("src/assets/translations");
  let enName = "";

  for(const file of files) {
    try {
      const langCode = file.split(".")[0];
      const data = JSON.parse(await readFile(`src/assets/translations/${file}`, "utf-8")) as TrObject;
      tr.addTranslations(langCode, data);
      if(langCode.startsWith("en") && enName !== defaultLocale)
        enName = langCode;
    }
    catch(err) {
      console.error(k.red(`Error while loading translations from '${file}':\n`), err);
    }
  }

  for(const [regex, fn] of transforms)
    tr.addTransform(regex, fn);

  tr.setLanguage(enName ?? defaultLocale);
}

//#region utils

/** Returns the localization map for all locales, given the common translation key */
export function getLocMap(trKey: string, prefix = ""): LocalizationMap {
  const locMap = {} as LocalizationMap;

  for(const [locale, trObj] of Object.entries(trans)) {
    const transform = (value: string): string => {
      const tf = valTransforms.find((t) => t.regex.test(value));

      return tf
        ? value.replace(tf.regex, (...matches) => String(tf.fn(matches, locale)))
        : value;
    };

    // try to resolve via traversal (e.g. `trObj["key"]["parts"]`)
    const keyParts = trKey.split(".");
    let value: string | TrObject | undefined = trObj;
    for(const part of keyParts) {
      if(typeof value !== "object" || value === null)
        break;
      value = value?.[part];
    }
    if(typeof value === "string")
      locMap[locale as keyof LocalizationMap] = prefix + transform(value);

    // try falling back to `trObj["key.parts"]`
    value = trObj?.[trKey];
    if(typeof value === "string")
      locMap[locale as keyof LocalizationMap] = prefix + transform(value);
  }

  return Object.keys(locMap).length === 0
    ? { "en-US": trKey }
    : locMap;
}


//#region #DBG example

// const transExample = {
//   foo: {
//     bar: "Bar {{test}}",
//     baz: "Baz {{1}} {{two}} {{thr3}}",
//   },
// };

// tr.addTranslations("en", transExample);
// tr.setLanguage("en");

// tr("foo.bar", { test: "value" });     // "Bar value"
// tr("foo.baz", "one", "two", "three"); // "Baz one two three"
