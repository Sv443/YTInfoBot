import { type EmbedBuilder, type Message } from "discord.js";
import { Event } from "@lib/Event.ts";
import { VideoInfo } from "@cmd/VideoInfo.ts";
import { em } from "@lib/db.ts";
import { GuildConfig } from "@models/GuildConfig.model.ts";

/** Regex that detects youtube.com, music.youtube.com, and youtu.be links */
const ytVideoRegexStr = "(?:https?:\\/\\/)?(?:www\\.)?(?:youtube\\.com\\/watch\\?v=|music\\.youtube\\.com\\/watch\\?v=|youtu\\.be\\/)([a-zA-Z0-9_-]+)";
const ytVideoRegex = new RegExp(ytVideoRegexStr);
const ytVideoRegexGlobal = new RegExp(ytVideoRegexStr, "gm");

export class MessageCreate extends Event {
  constructor() {
    super("messageCreate");
  }

  public async run(msg: Message) {
    if(msg.author.bot)
      return;

    if(msg.content.match(ytVideoRegex))
      MessageCreate.handleYtVideoMsg(msg);
  }

  //#region utils

  /** Handles a message that contains at least one YT video link */
  public static async handleYtVideoMsg(msg: Message) {
    const allVids = msg.content.match(ytVideoRegexGlobal)?.map((url) => ({
      url,
      videoId: VideoInfo.parseVideoId(url) ?? undefined,
    }));

    if(!allVids || allVids.length === 0)
      return;

    const guildCfg = await em.findOne(GuildConfig, { id: msg.guildId });
    const embeds = [] as EmbedBuilder[];

    if(!guildCfg)
      return;

    for(const { videoId, url } of allVids) {
      if(!videoId)
        continue;

      const embed = await VideoInfo.getVideoInfoEmbed({
        url,
        videoId,
        guildCfg,
        type: guildCfg?.defaultVideoInfoType ?? "reduced",
      });

      if(!embed)
        continue;

      embeds.push(embed);
    }

    msg.reply({
      embeds,
      allowedMentions: { repliedUser: false },
    });
  }
}
