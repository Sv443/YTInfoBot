import globals from "globals";
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: [
      "**/*.min.*",
      "**/*.user.js",
      "**/*.map",
      "dist/**/*",
      "src/dev/**/*",
      "**/test.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        Atomics: "readonly",
        SharedArrayBuffer: "readonly",
      },
      parserOptions: {
        projectService: true,
      },
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-unreachable": "off",
      quotes: ["error", "double"],
      semi: ["error", "always"],
      "eol-last": ["error", "always"],
      "no-async-promise-executor": "off",
      "no-cond-assign": "off",
      indent: ["error", 2, {
        ignoredNodes: ["VariableDeclaration[declarations.length=0]"],
      }],
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": ["warn", {
        vars: "local",
        ignoreRestSiblings: true,
        args: "after-used",
        argsIgnorePattern: "^_",
      }],
      "no-unused-vars": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-expressions": ["error", {
        allowShortCircuit: true,
        allowTernary: true,
        allowTaggedTemplates: true,
      }],
      "@typescript-eslint/no-unsafe-declaration-merging": "off",
      "@typescript-eslint/no-deprecated": "error",
      "comma-dangle": ["error", "only-multiline"],
      "no-misleading-character-class": "off",
    },
  },
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "no-unused-vars": ["warn", {
        vars: "local",
        ignoreRestSiblings: true,
        args: "after-used",
        argsIgnorePattern: "^_",
      }],
    },
  },
);
