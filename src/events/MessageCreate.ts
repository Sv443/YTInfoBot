import { ButtonBuilder, ButtonStyle, PermissionFlagsBits, type ButtonInteraction, type CommandInteraction, type ContextMenuCommandInteraction, type EmbedBuilder, type Message } from "discord.js";
import { Event } from "@lib/Event.ts";
import { VideoInfoCmd, type VideoInfoType } from "@cmd/VideoInfo.ts";
import { em } from "@lib/db.ts";
import { GuildConfig } from "@models/GuildConfig.model.ts";
import { UserSettings } from "@models/UserSettings.model.ts";
import { Col, useEmbedify } from "@lib/embedify.ts";
import { useButtons } from "@lib/components.ts";
import { defaultLocale, tr } from "@lib/translate.ts";

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
      setImmediate(() => MessageCreateEvt.handleYtLinkMsg(msg, undefined, undefined, true));
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

    const allVids = msg.content.match(ytVideoRegexGlobal)?.map((url) => ({
      url,
      videoId: VideoInfoCmd.parseVideoId(url),
    }));

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

    let checked = 0;

    for(const { videoId, url } of allVidsDeduped) {
      checked++;
      if(!videoId)
        if(allVidsDeduped.length === checked)
          return notFound(tr.for(locale, "errors.noYtVidLinksFound"));
        else
          continue;

      const embed = await VideoInfoCmd.getVideoInfoEmbed({
        url,
        videoId,
        guildCfg,
        type: typeOverride ?? guildCfg?.defaultVideoInfoType ?? "reduced",
        omitTitleAndThumb: isAutoReply,
        locale,
      });

      if(!embed)
        continue;

      embeds.push(embed);
    }

    if(embeds.length === 0)
      return isAutoReply ? undefined : notFound(tr.for(locale, "errors.noVidInfoFound"));

    if(int)
      return int.editReply({
        embeds,
        allowedMentions: { repliedUser: false },
      });

    const rep = await msg.reply({
      embeds,
      allowedMentions: { repliedUser: false },
      ...(isAutoReply
        ? useButtons(new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel(tr.for(locale, "buttons.delete")).setCustomId("delete_auto_reply").setEmoji("🗑️"))
        : {}
      ),
    });

    let conf: ButtonInteraction | undefined;

    try {
      conf = await rep.awaitMessageComponent({
        filter: ({ user, memberPermissions }) =>
          user.id === userId || (memberPermissions?.has(PermissionFlagsBits.ManageMessages) ?? false),
        time: 60_000,
      }) as ButtonInteraction;

      await conf.deferUpdate();

      if(conf.customId === "delete_auto_reply")
        return rep.delete();
    }
    catch {
      if(rep.editable)
        return rep.edit({ embeds, allowedMentions: { repliedUser: false }, components: [] });
    }
  }
}
