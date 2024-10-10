import { Events } from "discord.js";
import k from "kleur";
import { client, botToken } from "@lib/client.ts";
import { initDatabase } from "@lib/db.ts";
import { initRegistry } from "@lib/registry.ts";
import { autoPlural } from "@lib/text.ts";
import { getEnvVar } from "@lib/env.ts";

const requiredEnvVars = ["BOT_TOKEN", "APPLICATION_ID", "DB_URL", "BOT_INVITE_URL", "SUPPORT_SERVER_INVITE_URL"];

/** Called before the client is ready to check for environment variables and to initialize the client and database */
async function preInit() {
  const missingEnvVars = requiredEnvVars.filter((envVar) => !getEnvVar(envVar, "stringNoEmpty"));

  if(missingEnvVars.length > 0) {
    console.error(`Missing required environment ${autoPlural("variable", missingEnvVars)}:\n- ${missingEnvVars.join("\n- ")}`);
    setImmediate(() => process.exit(1));
    return;
  }

  console.log(k.gray("\nLogging in..."));
  await Promise.all([
    initDatabase(),
    new Promise((resolve) => {
      client.once("ready", resolve);
      client.login(botToken);
    }),
  ]);

  client.on(Events.Error, (err) => console.error(k.red("Client error:"), err));

  process.on("unhandledRejection", (reason, promise) => {
    console.error(k.red("Unhandled Rejection at:"), promise, k.red("\nRejection reason:"), reason);
  });

  init();
}

/** Initializes the bot after the client is ready */
async function init() {
  await initRegistry();

  console.log(`${k.blue("Bot is ready")}`);
}

preInit();
