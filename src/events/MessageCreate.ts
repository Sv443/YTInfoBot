import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, type ButtonInteraction, type CommandInteraction, type ContextMenuCommandInteraction, type EmbedBuilder, type Message } from "discord.js";
import { Event } from "@lib/Event.js";
import { VideoInfoCmd, type VideoInfoType } from "@cmd/VideoInfo.js";
import { em } from "@lib/db.js";
import { GuildConfig, isValidLinksPerReplyLimit, linksPerReplyLimitDefault } from "@models/GuildConfig.model.js";
import { UserSettings } from "@models/UserSettings.model.js";
import { Col, useEmbedify } from "@lib/embedify.js";
import { useButtons } from "@lib/components.js";
import { defaultLocale, tr } from "@lib/translate.js";

/**
 * Regex that detects youtube.com, music.youtube.com, and youtu.be video links and captures the full URL, including all query parameters and the hash.  
 * The `v` parameter of watch URLs may be at any position in the query string.  
 * The URL ends at whitespace, `<`, `>`, `(`, `)`, `|` or at trailing sentence punctuation (`.,;:!?'"`).
 */
const ytVideoRegexStr = [
  "(?:https?:\\/\\/)?",
  "(?:",
  // watch URLs - the query string must contain a `v` parameter somewhere
  "(?:www\\.|music\\.)?youtube\\.com\\/watch\\?(?=(?:[^\\s<>()|#]*&)?v=[a-zA-Z0-9_-]+)[^\\s<>()|]*[^\\s<>()|.,;:!?'\"]",
  "|",
  // short URLs - the video ID is in the path, optionally followed by a query string and/or hash
  "youtu\\.be\\/[a-zA-Z0-9_-]+(?:[?#][^\\s<>()|]*[^\\s<>()|.,;:!?'\"])?",
  ")",
].join("");
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
      setImmediate(() => MessageCreateEvt.handleYtLinkMsg(msg, undefined, undefined, true).catch((err) => {
        console.error("Couldn't handle YT link message:", err);
      }));
  }

  //#region s:handleLnkMsg

  /** Handles a message that contains at least one YT video link - if no links are found, replies with an error */
  public static async handleYtLinkMsg(
    msg: Pick<Message, "content" | "guildId" | "author" | "reply">,
    int?: CommandInteraction | ContextMenuCommandInteraction,
    typeOverride?: VideoInfoType,
    isAutoReply = false
  ) {
    const userId = (int as CommandInteraction | undefined)?.user.id ?? msg.author.id;
    const { guildId } = msg;

    const notFound = (txt: string) => (int?.editReply ?? msg.reply)({
      ...useEmbedify(txt, Col.Error),
      allowedMentions: { repliedUser: false },
    });

    int && !int.deferred && await int.deferReply();

    const allVids = msg.content.match(ytVideoRegexGlobal)?.map((rawUrl) => {
      // the scheme is optional in the regex, but required for URL parsing
      const url = /^https?:\/\//.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

      return {
        url,
        videoId: VideoInfoCmd.parseVideoId(url),
      };
    });

    const allVidsDeduped = allVids?.filter((vid, idx, self) => self.findIndex((v) => v.videoId === vid.videoId) === idx);

    const locale = (await em.findOne(GuildConfig, { id: guildId }))?.locale ?? defaultLocale;

    if(!allVidsDeduped || allVidsDeduped.length === 0)
      return notFound(tr.for(locale, "errors.noYtVidLinksFound"));

    const guildCfg = await em.findOne(GuildConfig, { id: guildId });
    const embeds = [] as EmbedBuilder[];

    if(!guildCfg)
      return (int?.editReply ?? msg.reply)(useEmbedify(tr.for(locale, "errors.guildCfgInaccessible"), Col.Error));

    if(isAutoReply) {
      if(!guildCfg.autoReplyEnabled)
        return;

      const usrSett = await em.findOne(UserSettings, { id: msg.author.id });

      if(usrSett && !usrSett.autoReplyEnabled)
        return;
    }

    // only links with a parsable video ID count towards the guild's limit; anything beyond it is ignored
    const limit = isValidLinksPerReplyLimit(guildCfg.linksPerReplyLimit)
      ? guildCfg.linksPerReplyLimit
      : linksPerReplyLimitDefault;
    const vidsToProcess = allVidsDeduped.filter(({ videoId }) => Boolean(videoId)).slice(0, limit);

    if(vidsToProcess.length === 0)
      return notFound(tr.for(locale, "errors.noYtVidLinksFound"));

    let onlyUrl: string | undefined;

    for(const { videoId, url } of vidsToProcess) {
      if(!videoId)
        continue;

      if(vidsToProcess.length === 1) {
        try {
          onlyUrl = VideoInfoCmd.sanitizeVideoUrl(url);
        }
        catch {
          onlyUrl = undefined;
        }
      }

      const embed = await VideoInfoCmd.getVideoInfoEmbed({
        url,
        videoId,
        guildCfg,
        type: typeOverride ?? guildCfg?.defaultVideoInfoType ?? "everything",
        omitTitleAndThumb: isAutoReply,
        locale,
      });

      if(!embed)
        continue;

      embeds.push(embed);
    }

    if(embeds.length === 0)
      return isAutoReply ? undefined : notFound(tr.for(locale, "errors.noVidInfoFound"));

    const getOnlyUrlLinkBtnBuilder = () => onlyUrl ? [new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(tr.for(locale, "buttons.open")).setURL(onlyUrl)] : [];

    // link buttons don't emit interactions, so there's nothing to await for context menu / command replies
    if(int)
      return int.editReply({
        embeds,
        allowedMentions: { repliedUser: false },
        ...useButtons([[
          ...getOnlyUrlLinkBtnBuilder(),
        ]]),
      });

    const promptSec = 60;

    const rep = await msg.reply({
      embeds,
      allowedMentions: { repliedUser: false },
      ...(isAutoReply
        ? useButtons([[
          ...getOnlyUrlLinkBtnBuilder(),
          new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel(tr.for(locale, "buttons.delete_limited", promptSec * 1000)).setCustomId("delete_auto_reply").setEmoji("🗑️")
        ]])
        : useButtons([[
          ...getOnlyUrlLinkBtnBuilder(),
        ]])
      ),
    });

    let conf: ButtonInteraction | undefined;

    try {
      conf = await rep.awaitMessageComponent({
        filter: ({ user, memberPermissions }) =>
          user.id === userId || (memberPermissions?.has(PermissionFlagsBits.ManageMessages) ?? false),
        time: promptSec * 1000,
      }) as ButtonInteraction;

      await conf.deferUpdate();

      if(conf.customId === "delete_auto_reply")
        return await rep.delete();
    }
    catch {
      // the reply might have been deleted in the meantime (error 10008 "Unknown Message"), in which case there's nothing left to edit
      try {
        if(rep.editable)
          return await rep.edit({ embeds, allowedMentions: { repliedUser: false }, components: [
            ...(onlyUrl ? [
              new ActionRowBuilder<ButtonBuilder>().setComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(tr.for(locale, "buttons.open")).setURL(onlyUrl))
            ] : [])
          ] });
      }
      catch(err) {
        if((err as { code?: number })?.code !== 10008)
          console.error("Couldn't remove components from auto reply:", err);
      }
    }
  }
}
