import { getEnvVar } from "@lib/env.js";

//#region check guilds

const chkGldIntervalRaw = getEnvVar("GUILD_CHECK_INTERVAL", "number");
export const chkGldInterval = Math.max(isNaN(chkGldIntervalRaw) ? 300 : chkGldIntervalRaw, 10);

/** Timestamp of the last guild check */
export let lastGldChkTime = 0;
export const updateLastGldChkTime = () => lastGldChkTime = Date.now();

//#region metrics

export const metGuildId = getEnvVar("METRICS_GUILD", "stringOrUndefined");
export const metChanId = getEnvVar("METRICS_CHANNEL", "stringOrUndefined");

const metUpdIvRaw = getEnvVar("METRICS_UPDATE_INTERVAL", "number");
export const metUpdInterval = Math.max(isNaN(metUpdIvRaw) ? 60 : metUpdIvRaw, 1);
