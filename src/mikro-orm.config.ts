import "dotenv/config";
import { defineConfig } from "@mikro-orm/core";

export const config = defineConfig({
  dbName: "yt-info-bot",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  charset: "utf8",
  entities: ["dist/**/*.model.js"],
  entitiesTs: ["src/**/*.model.ts"],
  debug: process.env.DB_DEBUG?.trim() === "true",
});
