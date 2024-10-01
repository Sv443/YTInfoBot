import { defineConfig } from "@mikro-orm/core";
import { envVarEquals, getEnvVar } from "@lib/env.ts";

export const config = defineConfig({
  dbName: "yt-info-bot",
  user: getEnvVar("DB_USER")!,
  password: getEnvVar("DB_PASSWORD")!,
  charset: "utf8",
  entities: ["dist/**/*.model.js"],
  entitiesTs: ["src/**/*.model.ts"],
  debug: envVarEquals("DB_DEBUG", true),
});
