import "dotenv/config";
import { ActivityType, Client, GatewayIntentBits, REST } from "discord.js";

export const botToken = process.env.BOT_TOKEN!;
export const clientId = process.env.APPLICATION_ID!;

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  presence: {
    status: "online",
    activities: [
      {
        name: "Awaiting video links",
        type: ActivityType.Custom,
      },
    ],
  },
});

export const rest = new REST().setToken(process.env.BOT_TOKEN!);
