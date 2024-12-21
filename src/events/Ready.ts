import { EmbedBuilder, type Client, type Message } from "discord.js";
import { readFile, writeFile } from "node:fs/promises";
import { em } from "@lib/db.ts";
import { Event } from "@lib/Event.ts";
import { registerCommandsForGuild } from "@lib/registry.ts";
import { GuildConfig } from "@models/GuildConfig.model.ts";
import { getEnvVar } from "@lib/env.ts";
import { getHash } from "@lib/crypto.ts";
import { Col } from "@lib/embedify.ts";

//#region types

type MetricsManifest = {
  msgId: string | null;
  metricsHash: string | null;
};

type MetricsData = {
  guilds: number;
};

//#region vars

const metGuildId = getEnvVar("METRICS_GUILD", "stringNoEmpty");
const metChanId = getEnvVar("METRICS_CHANNEL", "stringNoEmpty");

const metricsManifFile = ".metrics.json";
let metricsData: MetricsManifest | undefined;
let firstMetricRun = true;

//#region constructor

export class ReadyEvt extends Event {
  constructor() {
    super("ready");
  }

  //#region pb:run

  public async run(client: Client) {
    let i = 0;
    setInterval(() => {
      i++;
      ReadyEvt.intervalChecks(client, i);
    }, 1_000);
    ReadyEvt.intervalChecks(client, i);
  }

  //#region s:intervalChecks

  /** Runs all interval checks */
  public static async intervalChecks(client: Client, i: number) {
    try {
      const tasks: Promise<void | unknown>[] = [];

      if(i === 0 || i % 3 === 0)
        tasks.push(ReadyEvt.updateMetrics(client));

      if(i === 0 || i % 20 === 0)
        tasks.push(ReadyEvt.checkGuildJoin(client));

      await Promise.allSettled(tasks);
    }
    catch(e) {
      console.error("Couldn't run interval checks:", e);
    }
  }

  //#region s:chkGuildJoin

  /** Checks if guilds were joined while the bot was offline and creates a GuildConfig for it and registers its slash commands */
  private static async checkGuildJoin(client: Client) {
    const registeredGuilds = await em.findAll(GuildConfig);
    const guilds = [...client.guilds.cache.values()];

    for(const guild of guilds)
      if(!registeredGuilds.some(g => g.id === guild.id))
        await Promise.allSettled([
          em.persistAndFlush(new GuildConfig(guild.id)),
          registerCommandsForGuild(guild.id),
        ]);
  }

  //#region s:updateMetrics

  /** Update metrics */
  private static async updateMetrics(client: Client) {
    try {
      if(!metGuildId || !metChanId)
        return;

      const latestMetrics = {
        guilds: client.guilds.cache.size,
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
            metricsMsg = await metricsChan?.send(ReadyEvt.useMetricsEmbed(latestMetrics));
            metricsData!.msgId = metricsMsg?.id;
            await writeFile(metricsManifFile, JSON.stringify(metricsData));
          };

          try {
            if(!metricsMsg)
              recreateMsg();
            else
              await metricsMsg?.edit(ReadyEvt.useMetricsEmbed(latestMetrics));
          }
          catch {
            recreateMsg();
          }
        }
        else if(!metricsData.msgId || metricsData.msgId.length === 0) {
          metricsMsg = await metricsChan?.send(ReadyEvt.useMetricsEmbed(latestMetrics));
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

  //#region s:metricsEmbed

  /** Get the metrics / stats embed */
  private static useMetricsEmbed(metrics: MetricsData) {
    const ebd = new EmbedBuilder()
      .setTitle("Metrics")
      .setFields([
        { name: "Guilds", value: String(metrics.guilds), inline: true },
      ])
      .setColor(Col.Info);

    return {
      embeds: [ebd],
    };
  }
}
