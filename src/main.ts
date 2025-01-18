import { Events, type Client } from "discord.js";
import k from "kleur";
import "dotenv/config";
import { client, botToken } from "@lib/client.ts";
import { em, initDatabase } from "@lib/db.ts";
import { initRegistry, registerCommandsForGuild } from "@lib/registry.ts";
import { autoPlural } from "@lib/text.ts";
import { envVarEq, getEnvVar } from "@lib/env.ts";
import { initTranslations } from "@lib/translate.ts";
import { metChanId, metGuildId, updateMetrics } from "@src/metrics.ts";
import { GuildConfig } from "@models/GuildConfig.model.ts";

//#region validate env

const requiredEnvVars = ["DB_URL", "APPLICATION_ID", "BOT_TOKEN", "BOT_INVITE_URL", "SUPPORT_SERVER_INVITE_URL"] as const;

/** Called before the client is ready to check for environment variables and to initialize the client and database */
async function init() {
  const missingEnvVars = requiredEnvVars.filter((envVar) => !getEnvVar(envVar, "stringOrUndefined"));

  if(missingEnvVars.length > 0) {
    console.error(`${k.red(`Missing ${missingEnvVars.length} required environment ${autoPlural("variable", missingEnvVars)}:`)}\n- ${missingEnvVars.join("\n- ")}\n`);
    console.error("Use the command `pnpm prepare-env` to create the necessary env files if they don't exist already.\n");
    return setImmediate(() => process.exit(1));
  }

  //#region init bot

  console.log(k.gray("\nInitializing and logging in..."));

  await initTranslations();

  await new Promise((resolve) => {
    client.once("ready", resolve);
    client.login(botToken);
  });

  await Promise.all([
    initRegistry(),
    initDatabase(),
  ]);

  client.on(Events.Error, (err) => console.error(k.red("Client error:"), err));

  process.on("unhandledRejection", (reason, promise) => {
    console.error(k.red("Unhandled rejection at:"), promise, k.red("\nRejection reason:"), reason);
  });

  console.log(k.blue(`${client.user?.displayName ?? client.user?.username} is ready.\n`));
  envVarEq("BELL_ON_READY", true) && process.stdout.write("\u0007");

  let i = 0;
  intervalChecks(client, i);
  setInterval(() => {
    i++;
    intervalChecks(client, i);
  }, 1000);
}


//#region intervalChks

const metUpdIvRaw = getEnvVar("METRICS_UPDATE_INTERVAL", "number");
const metUpdInterval = Math.max(isNaN(metUpdIvRaw) ? 60 : metUpdIvRaw, 1);

const chkGldIntervalRaw = getEnvVar("GUILD_CHECK_INTERVAL", "number");
const chkGldInterval = Math.max(isNaN(chkGldIntervalRaw) ? 300 : chkGldIntervalRaw, 10);

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

  for(const guild of [...client.guilds.cache.values()])
    !registeredGuilds.some(g => g.id === guild.id)
      && tasks.push(
        em.persistAndFlush(new GuildConfig(guild.id)),
        registerCommandsForGuild(guild.id),
      );

  for(const guild of registeredGuilds)
    if(!client.guilds.cache.has(guild.id))
      tasks.push(em.removeAndFlush(guild));

  await Promise.allSettled(tasks);
}

init();
