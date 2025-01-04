import { readFile, writeFile } from "node:fs/promises";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, type Client, type GuildMember, type Message, type MessageCreateOptions } from "discord.js";
import k from "kleur";
import "dotenv/config";
import { client, botToken } from "@lib/client.ts";
import { em, initDatabase } from "@lib/db.ts";
import { cmdInstances, initRegistry, registerCommandsForGuild } from "@lib/registry.ts";
import { autoPlural } from "@lib/text.ts";
import { envVarEq, getEnvVar } from "@lib/env.ts";
import { initTranslations } from "@lib/translate.ts";
import { getHash } from "@lib/crypto.ts";
import { getCommitHash, ghBaseUrl } from "@lib/misc.ts";
import { Col } from "@lib/embedify.ts";
import { GuildConfig } from "@models/GuildConfig.model.ts";
import packageJson from "@root/package.json" with { type: "json" };
import { UserSettings } from "@models/UserSettings.model.ts";
import { resolve } from "node:path";

//#region validate env

const requiredEnvVars = ["DB_URL", "APPLICATION_ID", "BOT_TOKEN", "BOT_INVITE_URL", "SUPPORT_SERVER_INVITE_URL"] as const;

/** Called before the client is ready to check for environment variables and to initialize the client and database */
async function init() {
  const missingEnvVars = requiredEnvVars.filter((envVar) => !getEnvVar(envVar, "stringOrUndefined"));

  if(missingEnvVars.length > 0) {
    console.error(`${k.red(`Missing ${missingEnvVars.length} required environment ${autoPlural("variable", missingEnvVars)}:`)}\n- ${missingEnvVars.join("\n- ")}\n`);
    console.error("Use the command `pnpm prepare-env` to create the necessary env files if they don't exist already.\n");
    setImmediate(() => process.exit(1));
    return;
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

//#region metrics:vars

const metGuildId = getEnvVar("METRICS_GUILD", "stringOrUndefined");
const metChanId = getEnvVar("METRICS_CHANNEL", "stringOrUndefined");
const metUpdIvRaw = getEnvVar("METRICS_UPDATE_INTERVAL", "number");
const metUpdInterval = Math.max(isNaN(metUpdIvRaw) ? 30 : metUpdIvRaw, 3);

const initTime = Date.now();
const metricsManifFile = resolve(".metrics.json");
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
  slashCmdAmt: number;
  ctxCmdAmt: number;
  usersAmt: number;
  totalMembersAmt: number;
  uniqueMembersAmt: number;
};

//#region m:intervalChks

/** Runs all interval checks */
async function intervalChecks(client: Client, i: number) {
  try {
    const tasks: Promise<void | unknown>[] = [];

    if(i === 0 || i % metUpdInterval === 0) {
      tasks.push(updateMetrics(client));
      tasks.push(checkGuilds(client));
    }

    tasks.length > 0 && await Promise.allSettled(tasks);
  }
  catch(e) {
    console.error("Couldn't run interval checks:", e);
  }
}

//#region m:chkGuildJoin

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

//#region m:updateMetr

/** Update metrics */
async function updateMetrics(client: Client) {
  try {
    if(!metGuildId || !metChanId)
      return;

    let slashCmdAmt = 0, ctxCmdAmt = 0;
    for(const { type } of [...cmdInstances.values()]) {
      if(type === "slash")
        slashCmdAmt++;
      else if(type === "ctx")
        ctxCmdAmt++;
    }

    await client.guilds.fetch();

    const totalMembersAmt = client.guilds.cache
      .reduce((acc, g) => acc + g.memberCount, 0);

    const memMap = new Map<string, GuildMember>();
    const memMapPromises: Promise<void>[] = [];
    for(const g of client.guilds.cache.values()) {
      memMapPromises.push(new Promise(async (res, rej) => {
        try {
          await g.members.fetch();
          for(const m of g.members.cache.values()) {
            if(memMap.has(m.id) || m.user.bot || m.user.system || m.user.partial || m.partial)
              continue;
            memMap.set(m.id, m);
          }
          res();
        }
        catch(e) {
          rej(e);
        }
      }));
    }
    await Promise.all(memMapPromises);

    const latestMetrics = {
      guildsAmt: client.guilds.cache.size,
      uptimeStr: getUptime(),
      slashCmdAmt,
      ctxCmdAmt,
      usersAmt: (await em.findAll(UserSettings)).length,
      totalMembersAmt,
      uniqueMembersAmt: memMap.size,
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
      const latestMetHash = getHash(JSON.stringify(latestMetrics));
      const metricsChanged = firstMetricRun || metricsData.metricsHash !== latestMetHash;
      if(metricsChanged)
        metricsData.metricsHash = latestMetHash;

      if(metricsChanged && metricsData.msgId && metricsData.msgId.length > 0) {
        metricsMsg = (await metricsChan.messages.fetch({ limit: 1, around: metricsData.msgId })).first();

        const recreateMsg = async () => {
          await metricsMsg?.delete();
          metricsMsg = await metricsChan?.send(await useMetricsMsg(latestMetrics));
          metricsData!.msgId = metricsMsg?.id;
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
        finally {
          try {
            await writeFile(metricsManifFile, JSON.stringify(metricsData));
          }
          catch(e) {
            console.error("Couldn't write metrics manifest:", e);
          }
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
  const {
    uptimeStr, usersAmt,
    guildsAmt, totalMembersAmt,
    uniqueMembersAmt, slashCmdAmt,
    ctxCmdAmt,
  } = metrics;
  const cmdsTotal = slashCmdAmt + ctxCmdAmt;

  const ebd = new EmbedBuilder()
    .setTitle("Bot metrics:")
    .setFields([
      { name: "Uptime:", value: String(uptimeStr), inline: false },
      { name: "Users:", value: String(usersAmt), inline: true },
      { name: "Guilds:", value: String(guildsAmt), inline: true },
      { name: "Members:", value: `${totalMembersAmt} total\n${uniqueMembersAmt} unique`, inline: true },
      { name: `${autoPlural("Command", cmdsTotal)} (${cmdsTotal}):`, value: `${slashCmdAmt} ${autoPlural("slash command", slashCmdAmt)}\n${ctxCmdAmt} ${autoPlural("context command", ctxCmdAmt)}`, inline: false },
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
            .setLabel("Open repo at commit")
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
