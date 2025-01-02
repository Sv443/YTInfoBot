import { ActivityType, Client, GatewayIntentBits, REST } from "discord.js";
import { getEnvVar } from "@lib/env.ts";

export const botToken = getEnvVar("BOT_TOKEN")!;
export const clientId = getEnvVar("APPLICATION_ID")!;

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  presence: {
    status: "online",
    activities: [
      {
        name: "Waiting for video links",
        type: ActivityType.Custom,
      },
    ],
  },
});

export const rest = new REST().setToken(botToken);
