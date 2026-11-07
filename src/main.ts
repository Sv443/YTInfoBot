import { styleText } from "node:util";
import { Events, type Client } from "discord.js";
import "dotenv/config";
import { client, botToken } from "@lib/client.js";
import { em, initDatabase } from "@lib/db.js";
import { initRegistry, registerCommandsForGuild } from "@lib/registry.js";
import { autoPlural } from "@lib/text.js";
import { envVarEq, getEnvVar } from "@lib/env.js";
import { initTranslations } from "@lib/translate.js";
import { requiredDbEnvVars } from "@src/mikro-orm.config.js";
import { updateMetrics } from "@src/metrics.js";
import { chkGldInterval, metChanId, metGuildId, metUpdInterval, updateLastGldChkTime } from "@src/constants.js";
import { GuildConfig } from "@models/GuildConfig.model.js";

//#region validate env

const requiredEnvVars = [...requiredDbEnvVars, "APPLICATION_ID", "BOT_TOKEN", "BOT_INVITE_URL", "SUPPORT_SERVER_INVITE_URL"] as const;

/** Called before the client is ready to check for environment variables and to initialize the client and database */
async function init() {
  const missingEnvVars = requiredEnvVars.filter((envVar) => !getEnvVar(envVar, "stringOrUndefined"));

  if(missingEnvVars.length > 0) {
    console.error(`${styleText("red", `Missing ${missingEnvVars.length} required environment ${autoPlural("variable", missingEnvVars)}:`)}\n- ${missingEnvVars.join("\n- ")}\n`);
    console.error("Use the command `pnpm prepare-env` to create the necessary env files if they don't exist already.\n");
    return setImmediate(() => process.exit(1));
  }

  //#region init bot

  console.log(styleText("gray", "\nInitializing and logging in..."));

  await initTranslations();

  await new Promise((resolve) => {
    client.once("clientReady", resolve);
    client.login(botToken);
  });

  await Promise.all([
    initRegistry(),
    initDatabase(),
  ]);

  try {
    const fixed = await GuildConfig.sanitizeAll();
    fixed > 0 && console.log(styleText("yellow", `Fixed ${fixed} out-of-bounds guild config ${autoPlural("value", fixed)}`));
  }
  catch(e) {
    console.error(styleText("red", "Couldn't sanitize guild configs:"), e);
  }

  client.on(Events.Error, (err) => console.error(styleText("red", "Client error:"), err));

  console.log(styleText("blue", `${client.user?.displayName ?? client.user?.username} is ready.\n`));
  envVarEq("BELL_ON_READY", true) && process.stdout.write("\u0007");

  let i = 0;
  intervalChecks(client, i);
  setInterval(() => {
    i++;
    intervalChecks(client, i);
  }, 1000);
}

//#region intervalChks

/** Runs all interval checks */
async function intervalChecks(client: Client, i: number) {
  try {
    const ivTasks: Promise<void | unknown>[] = [];

    if(metGuildId && metChanId && (i === 0 || i % metUpdInterval === 0))
      ivTasks.push(updateMetrics(client));
    if(i === 0 || i % chkGldInterval === 0)
      ivTasks.push(checkGuilds(client));

    ivTasks.length > 0 && await Promise.allSettled(ivTasks);
  }
  catch(e) {
    console.error("Couldn't run interval checks:", e);
  }
}

//#region chkGuildJoin

/**
 * Checks if guilds were joined while the bot was offline and creates a GuildConfig for them and registers slash commands.  
 * Also clears the guilds that the bot was removed from.
 */
async function checkGuilds(client: Client) {
  const registeredGuilds = await em.findAll(GuildConfig);
  const tasks: Promise<unknown | void>[] = [];

  for(const { id } of [...client.guilds.cache.values()])
    !registeredGuilds.find(g => g.id === id)
      && tasks.push(
        em.persist(new GuildConfig(id)).flush(),
        registerCommandsForGuild(id),
      );

  for(const guild of registeredGuilds)
    if(!client.guilds.cache.has(guild.id))
      tasks.push(em.remove(guild).flush());

  try {
    await Promise.allSettled(tasks);
    updateLastGldChkTime();
  }
  catch(e) {
    console.error(styleText("red", "Couldn't check guilds:"), e);
  }
}

//#region run init

process.on("unhandledRejection", (reason, promise) => {
  console.error(styleText("red", `${styleText("bold", "[!]")} Unhandled Promise rejection:`), promise, styleText("red", `\n\n${styleText("bold", "[!]")} Rejection reason:`), reason);
});

process.on("uncaughtException", (err, origin) => {
  console.error(styleText("red", `${styleText("bold", "[!]")} Uncaught exception:`), err, styleText("red", `\n\n${styleText("bold", "[!]")} Origin:`), origin);
});

init();
