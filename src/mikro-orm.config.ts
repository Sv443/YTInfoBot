import { defineConfig } from "@mikro-orm/core";
import { envVarEq, getEnvVar } from "@lib/env.ts";

export const config = defineConfig({
  clientUrl: getEnvVar("DB_URL", "stringOrUndefined"),
  charset: "utf8",
  entities: ["dist/**/*.model.js"],
  entitiesTs: ["src/**/*.model.ts"],
  debug: envVarEq("DB_DEBUG", true),
});
