import { resolve } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type Client, type GuildMember, type Message, type MessageCreateOptions, time } from "discord.js";
import { getCommitHash, getHash, ghBaseUrl } from "@lib/misc.js";
import { Col } from "@lib/embedify.js";
import { cmdInstances } from "@lib/registry.js";
import { em } from "@lib/db.js";
import { autoPlural, secsToTimeStr } from "@lib/text.js";
import { UserSettings } from "@models/UserSettings.model.js";
import pkg from "@root/package.json" with { type: "json" };
import { chkGldInterval, lastGldChkTime, metChanId, metGuildId, metUpdInterval } from "@src/constants.js";

//#region metrics:vars

const initTime = Date.now();
const commitHash = await getCommitHash(true);

const metricsManifFile = resolve(".metrics.json");
let metricsData: MetricsManifest | undefined;
let firstMetricRun = true;

//#region m:types

export type MetricsManifest = {
  msgId: string | null;
  metricsHash: string | null;
};

export type MetricsData = {
  guildsAmt: number;
  uptimeStr: string;
  slashCmdAmt: number;
  ctxCmdAmt: number;
  usersAmt: number;
  totalMembersAmt: number;
  uniqueMembersAmt: number;
};

//#region updateMetr

/** Update metrics */
export async function updateMetrics(client: Client) {
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

    const totalMembersAmt = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

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

      if(metricsChanged && typeof metricsData.msgId === "string" && metricsData.msgId.length > 0) {
        metricsMsg = (await metricsChan.messages.fetch({ limit: 3, around: metricsData.msgId })).find(m => m.id === metricsData!.msgId);

        const recreateMsg = async () => {
          try {
            await metricsMsg?.delete();
          }
          catch {
            console.warn("Couldn't delete metrics message, creating a new one...");
          }
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
async function useMetricsMsg({ uptimeStr, usersAmt, guildsAmt, totalMembersAmt, uniqueMembersAmt, slashCmdAmt, ctxCmdAmt }: MetricsData) {
  const cmdsTotal = slashCmdAmt + ctxCmdAmt;

  const ebd = new EmbedBuilder()
    .setTitle("Bot metrics:")
    .setFields([
      { name: "👨‍👨‍👦‍👦 Guilds:", value: `${guildsAmt} ${autoPlural("guild", guildsAmt)}`, inline: true },
      { name: "🧑‍💻 Users:", value: `${usersAmt} in DB`, inline: true },
      { name: "🧑‍🦲 Members:", value: `${totalMembersAmt} total\n${uniqueMembersAmt} unique`, inline: true },
      { name: `⭐ ${autoPlural("Command", cmdsTotal)} (${cmdsTotal}):`, value: `${slashCmdAmt} ${autoPlural("slash command", slashCmdAmt)}\n${ctxCmdAmt} ${autoPlural("context command", ctxCmdAmt)}`, inline: false },
      { name: "⏲️ Uptime:", value: `${time(new Date(initTime), "R")}\nTotal: ${uptimeStr}`, inline: false },
      { name: "🧮 Last guild check:", value: lastGldChkTime === 0 ? "never" : `${time(new Date(lastGldChkTime), "R")}\nInterval: ${secsToTimeStr(chkGldInterval)}`, inline: false },
      { name: "✏️ Metrics updated:", value: `${time(new Date(), "R")}\nInterval: ${secsToTimeStr(metUpdInterval)}`, inline: false },
    ])
    .setFooter({ text: `v${pkg.version} - ${commitHash}` })
    .setColor(Col.Info);

  return {
    embeds: [ebd],
    components: [
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel("Open repo at commit")
            .setURL(`${ghBaseUrl}/tree/${commitHash}`)
        )
        .toJSON(),
    ],
  } as Pick<MessageCreateOptions, "embeds" | "components">;
}

/** Returns the uptime in a human-readable format */
function getUptime() {
  const upt = Math.floor((Date.now() - initTime) / 1000);

  return secsToTimeStr(upt, "en-US");
}
