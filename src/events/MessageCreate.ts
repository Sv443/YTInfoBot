import { type CommandInteraction, type ContextMenuCommandInteraction, type EmbedBuilder, type Message } from "discord.js";
import { Event } from "@lib/Event.ts";
import { VideoInfoCmd, type VideoInfoType } from "@cmd/VideoInfo.ts";
import { em } from "@lib/db.ts";
import { GuildConfig } from "@models/GuildConfig.model.ts";
import { UserSettings } from "@models/UserSettings.model.ts";
import { Col, embedify } from "@lib/embedify.ts";

/** Regex that detects youtube.com, music.youtube.com, and youtu.be links */
const ytVideoRegexStr = "(?:https?:\\/\\/)?(?:www\\.)?(?:youtube\\.com\\/watch\\?v=|music\\.youtube\\.com\\/watch\\?v=|youtu\\.be\\/)([a-zA-Z0-9_-]+)";
const ytVideoRegex = new RegExp(ytVideoRegexStr);
const ytVideoRegexGlobal = new RegExp(ytVideoRegexStr, "gm");

export class MessageCreateEvt extends Event {
  constructor() {
    super("messageCreate");
  }

  //#region pb:run

  public async run(msg: Message) {
    if(msg.author.bot)
      return;

    if(ytVideoRegex.test(msg.content))
      setImmediate(() => MessageCreateEvt.handleYtLinkMsg(msg));
  }

  //#region s:handleLnkMsg

  /** Handles a message that contains at least one YT video link - if no links are found, replies with an error */
  public static async handleYtLinkMsg(msg: Pick<Message, "content" | "guildId" | "author" | "reply">, int?: CommandInteraction | ContextMenuCommandInteraction, typeOverride?: VideoInfoType) {
    const noLinkFound = () => {
      const ebd = embedify("No YouTube video links were found in the message.", Col.Error);

      if(int)
        return int[int.deferred || int.replied ? "editReply" : "reply"]({
          embeds: [ebd],
          allowedMentions: { repliedUser: false },
        });
  
      return msg.reply({
        embeds: [ebd],
        allowedMentions: { repliedUser: false },
      });
    };

    int && !int.deferred && await int.deferReply();

    const allVids = msg.content.match(ytVideoRegexGlobal)?.map((url) => ({
      url,
      videoId: VideoInfoCmd.parseVideoId(url) ?? undefined,
    }));

    const allVidsDeduped = allVids?.filter((vid, idx, self) => self.findIndex((v) => v.videoId === vid.videoId) === idx);

    if(!allVidsDeduped || allVidsDeduped.length === 0)
      return noLinkFound();

    const guildCfg = await em.findOne(GuildConfig, { id: msg.guildId });
    const embeds = [] as EmbedBuilder[];

    if(!guildCfg || !guildCfg.autoReplyEnabled)
      return noLinkFound();

    const usrSett = await em.findOne(UserSettings, { id: msg.author.id });

    if(usrSett && !usrSett.autoReplyEnabled)
      return noLinkFound();

    let checked = 0;

    for(const { videoId, url } of allVidsDeduped) {
      checked++;
      if(!videoId)
        if(allVidsDeduped.length === checked)
          return noLinkFound();
        else
          continue;

      const embed = await VideoInfoCmd.getVideoInfoEmbed({
        url,
        videoId,
        guildCfg,
        type: typeOverride ?? guildCfg?.defaultVideoInfoType ?? "reduced",
        noTitle: true,
      });

      if(!embed)
        if(allVidsDeduped.length === checked)
          return noLinkFound();
        else
          continue;

      embeds.push(embed);
    }

    if(int)
      return int[int.deferred || int.replied ? "editReply" : "reply"]({
        embeds,
        allowedMentions: { repliedUser: false },
      });

    return msg.reply({
      embeds,
      allowedMentions: { repliedUser: false },
    });
  }
}
