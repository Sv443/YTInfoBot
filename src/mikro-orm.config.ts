import { defineConfig } from "@mikro-orm/core";
import { envVarEquals, getEnvVar } from "@lib/env.ts";

export const config = defineConfig({
  clientUrl: getEnvVar("DB_URL", "stringNoEmpty"),
  charset: "utf8",
  entities: ["dist/**/*.model.js"],
  entitiesTs: ["src/**/*.model.ts"],
  debug: envVarEquals("DB_DEBUG", true),
});
