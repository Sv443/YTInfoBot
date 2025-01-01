import { readFile, writeFile } from "node:fs/promises";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, type Client, type Message, type MessageCreateOptions } from "discord.js";
import k from "kleur";
import "dotenv/config";
import { client, botToken } from "@lib/client.ts";
import { em, initDatabase } from "@lib/db.ts";
import { cmdInstances, evtInstances, initRegistry, registerCommandsForGuild } from "@lib/registry.ts";
import { autoPlural } from "@lib/text.ts";
import { envVarEquals, getEnvVar } from "@lib/env.ts";
import { initTranslations } from "@lib/translate.ts";
import { getHash } from "@lib/crypto.ts";
import { getCommitHash, ghBaseUrl } from "@lib/misc.ts";
import { Col } from "@lib/embedify.ts";
import { GuildConfig } from "@models/GuildConfig.model.ts";
import packageJson from "@root/package.json" with { type: "json" };

//#region validate env

const requiredEnvVars = ["BOT_TOKEN", "APPLICATION_ID", "DB_URL", "BOT_INVITE_URL", "SUPPORT_SERVER_INVITE_URL"];

/** Called before the client is ready to check for environment variables and to initialize the client and database */
async function init() {
  const missingEnvVars = requiredEnvVars.filter((envVar) => !getEnvVar(envVar, "stringNoEmpty"));

  if(missingEnvVars.length > 0) {
    console.error(`${k.red(`Missing required environment ${autoPlural("variable", missingEnvVars)}:`)}\n- ${missingEnvVars.join("\n- ")}`);
    setImmediate(() => process.exit(1));
    return;
  }

  //#region init bot

  console.log(k.gray("\nInitializing and logging in..."));

  await Promise.all([
    initTranslations(),
    new Promise((resolve) => {
      client.once("ready", resolve);
      client.login(botToken);
    }),
  ]);

  await Promise.all([
    initRegistry(),
    initDatabase(),
  ]);

  client.on(Events.Error, (err) => console.error(k.red("Client error:"), err));

  process.on("unhandledRejection", (reason, promise) => {
    console.error(k.red("Unhandled rejection at:"), promise, k.red("\nRejection reason:"), reason);
  });

  console.log(k.blue(`${client.user?.displayName ?? client.user?.username} is ready.\n`));
  envVarEquals("BELL_ON_READY", true) && process.stdout.write("\u0007");

  let i = 0;
  intervalChecks(client, i);
  setInterval(() => {
    i++;
    intervalChecks(client, i);
  }, 1000);
}

//#region metrics:vars

const metGuildId = getEnvVar("METRICS_GUILD", "stringNoEmpty");
const metChanId = getEnvVar("METRICS_CHANNEL", "stringNoEmpty");

const initTime = Date.now();
const metricsManifFile = ".metrics.json";
let metricsData: MetricsManifest | undefined;
let firstMetricRun = true;

//#region metrics:types

type MetricsManifest = {
  msgId: string | null;
  metricsHash: string | null;
};

type MetricsData = {
  guildsAmt: number;
  uptimeStr: string;
  commandsAmt: number;
  eventsAmt: number;
};

//#region m:intervalChks

/** Runs all interval checks */
async function intervalChecks(client: Client, i: number) {
  try {
    const tasks: Promise<void | unknown>[] = [];

    if(i === 0 || i % 20 === 0) {
      tasks.push(updateMetrics(client));
      tasks.push(checkGuildJoin(client));
    }

    tasks.length > 0 && await Promise.allSettled(tasks);
  }
  catch(e) {
    console.error("Couldn't run interval checks:", e);
  }
}

//#region m:chkGuildJoin

/** Checks if guilds were joined while the bot was offline and creates a GuildConfig for it and registers its slash commands */
async function checkGuildJoin(client: Client) {
  const registeredGuilds = await em.findAll(GuildConfig);
  const guilds = [...client.guilds.cache.values()];

  for(const guild of guilds)
    if(!registeredGuilds.some(g => g.id === guild.id))
      await Promise.allSettled([
        em.persistAndFlush(new GuildConfig(guild.id)),
        registerCommandsForGuild(guild.id),
      ]);
}

//#region m:updateMetr

/** Update metrics */
async function updateMetrics(client: Client) {
  try {
    if(!metGuildId || !metChanId)
      return;

    const latestMetrics = {
      guildsAmt: client.guilds.cache.size,
      uptimeStr: getUptime(),
      commandsAmt: cmdInstances.size,
      eventsAmt: evtInstances.size,
    } as const satisfies MetricsData;

    const metricsChan = client.guilds.cache.find(g => g.id === metGuildId)?.channels.cache.find(c => c.id === metChanId);
    let metricsMsg: Message | undefined;

    try {
      metricsData = metricsData ?? JSON.parse(String(await readFile(metricsManifFile, "utf8")));
    }
    catch {
      metricsData = metricsData ?? { msgId: null, metricsHash: null };
    }

    if(metricsData && metricsChan && metricsChan.isTextBased()) {
      const metricsChanged = firstMetricRun || metricsData.metricsHash !== getHash(JSON.stringify(latestMetrics));
      if(metricsChanged)
        metricsData.metricsHash = getHash(JSON.stringify(latestMetrics));

      if(metricsChanged && metricsData.msgId && metricsData.msgId.length > 0) {
        metricsMsg = (await metricsChan.messages.fetch({ limit: 1, around: metricsData.msgId })).first();

        const recreateMsg = async () => {
          await metricsMsg?.delete();
          metricsMsg = await metricsChan?.send(await useMetricsMsg(latestMetrics));
          metricsData!.msgId = metricsMsg?.id;
          await writeFile(metricsManifFile, JSON.stringify(metricsData));
        };

        try {
          if(!metricsMsg)
            recreateMsg();
          else
            await metricsMsg?.edit(await useMetricsMsg(latestMetrics));
        }
        catch {
          recreateMsg();
        }
      }
      else if(!metricsData.msgId || metricsData.msgId.length === 0) {
        metricsMsg = await metricsChan?.send(await useMetricsMsg(latestMetrics));
        metricsData.msgId = metricsMsg?.id;
        await writeFile(metricsManifFile, JSON.stringify(metricsData));
      }

      firstMetricRun = false;
    }
  }
  catch(e) {
    console.error("Couldn't update metrics:", e);
  }
}

//#region m:metrEmbed

/** Get the metrics / stats embed and buttons */
async function useMetricsMsg(metrics: MetricsData) {
  const ebd = new EmbedBuilder()
    .setTitle("Bot metrics:")
    .setFields([
      { name: "Uptime", value: String(metrics.uptimeStr), inline: false },
      { name: "Guilds", value: String(metrics.guildsAmt), inline: true },
      { name: "Commands", value: String(metrics.commandsAmt), inline: true },
      { name: "Events", value: String(metrics.eventsAmt), inline: true },
    ])
    .setFooter({ text: `v${packageJson.version} - ${await getCommitHash(true)}` })
    .setColor(Col.Info);

  return {
    embeds: [ebd],
    components: [
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel("Browse current commit")
            .setURL(`${ghBaseUrl}/tree/${await getCommitHash()}`)
        )
        .toJSON(),
    ],
  } as Pick<MessageCreateOptions, "embeds" | "components">;
}

/** Returns the uptime in a human-readable format */
function getUptime() {
  const upt = Date.now() - initTime;

  return ([
    [(1000 * 60 * 60 * 24), `${Math.floor(upt / (1000 * 60 * 60 * 24))}d`],
    [(1000 * 60 * 60), `${Math.floor(upt / (1000 * 60 * 60)) % 24}h`],
    [(1000 * 60), `${Math.floor(upt / (1000 * 60)) % 60}m`],
    [0, `${Math.floor(upt / 1000) % 60}s`],
  ] as const)
    .filter(([d]) => upt >= d)
    .map(([, s]) => s)
    .join(" ");
}

init();
