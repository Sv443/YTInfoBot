import { EmbedBuilder, SlashCommandBuilder, type APIApplicationCommandOptionChoice, type CommandInteraction } from "discord.js";
import { AxiosError } from "axios";
import qs from "qs";
import { Col, useEmbedify } from "@lib/embedify.js";
import { CmdBase, SlashCommand } from "@lib/Command.js";
import { axios } from "@lib/axios.js";
import { generateEmojiProgressBar, joinArrayReadable, secsToTimeStr, secsToYtTime } from "@lib/text.js";
import { getBestThumbnailUrl } from "@lib/thumbnail.js";
import { formatNumber, valsWithin } from "@lib/math.js";
import { getLocMap, tr } from "@lib/translate.js";
import { em } from "@lib/db.js";
import { GuildConfig } from "@models/GuildConfig.model.js";
import { UserSettings } from "@models/UserSettings.model.js";
import type { DeArrowObj, ReturnYouTubeDislikeObj, SponsorBlockActionType, SponsorBlockCategory, SponsorBlockSegmentObj, YTVidDataObj } from "@src/types.js";

//#region constants

const allowedHosts = ["www.youtube.com", "youtube.com", "music.youtube.com", "youtu.be"];

// TODO: translate

export const videoInfoTypeChoices = [
  { name: "Everything", value: "everything" }, // (default)
  { name: "Reduced", value: "reduced" },
  { name: "Votes only", value: "votes_only" },
  { name: "DeArrow only", value: "dearrow_only" },
  { name: "Timestamps only", value: "timestamps_only" },
] as const satisfies APIApplicationCommandOptionChoice<VideoInfoType>[];

export const numberFormatChoices = [
  { name: "Long", value: "long" }, // (default)
  { name: "Short", value: "short" },
] as const satisfies APIApplicationCommandOptionChoice<NumberFormat>[];

const sponsorBlockCategoryColorEmojiMap = {
  sponsor: "🟩", // green
  selfpromo: "🟨", // yellow
  interaction: "🟪", // purple
  intro: "🟦", // blue
  outro: "🟫", // brown
  preview: "🟥", // red
  music_offtopic: "🟧", // orange
  filler: "⬜", // white
} as const satisfies Record<SponsorBlockCategory, string>;

const defaultSbCategories: SponsorBlockCategory[] = ["sponsor","selfpromo","interaction","intro","outro","preview","music_offtopic"];
const defaultSbActionTypes: SponsorBlockActionType[] = ["skip", "mute", "poi"];

//#region types

export type VideoInfoType = 
  | "reduced"
  | "everything"
  | "votes_only"
  | "dearrow_only"
  | "timestamps_only"

export type NumberFormat =
  | "short"
  | "long";

export type VideoInfoFetchData = {
  url: string;
  videoId: string;
  guildCfg: GuildConfig;
  type: VideoInfoType;
  omitTitleAndThumb?: boolean;
  locale: string;
}

//#region constructor

export class VideoInfoCmd extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName(CmdBase.getCmdName(tr.for("en-US", "commands.video_info.names.command")))
      .setNameLocalizations(getLocMap("commands.video_info.names.command", VideoInfoCmd.cmdPrefix))
      .setDescription(tr.for("en-US", "commands.video_info.descriptions.command"))
      .setDescriptionLocalizations(getLocMap("commands.video_info.descriptions.command"))
      .addStringOption(opt =>
        opt.setName(tr.for("en-US", "commands.video_info.names.args.video"))
          .setNameLocalizations(getLocMap("commands.video_info.names.args.video"))
          .setDescription(tr.for("en-US", "commands.video_info.descriptions.options.video"))
          .setDescriptionLocalizations(getLocMap("commands.video_info.descriptions.options.video"))
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName(tr.for("en-US", "commands.video_info.names.args.type"))
          .setNameLocalizations(getLocMap("commands.video_info.names.args.type"))
          .setDescription(tr.for("en-US", "commands.video_info.descriptions.options.type"))
          .setDescriptionLocalizations(getLocMap("commands.video_info.descriptions.options.type"))
          .addChoices(videoInfoTypeChoices)
      )
    );
  }

  //#region pb:run

  public async run(int: CommandInteraction) {
    if(!VideoInfoCmd.checkInGuild(int))
      return;

    const videoId = VideoInfoCmd.parseVideoId(int.options.get("video", true).value as string);

    if(!videoId)
      return int.reply(useEmbedify("commands.video_info.errors.invalidUrlOrId", Col.Error));

    const type = (int.options.get("type")?.value ?? "everything") as VideoInfoType;

    await int.deferReply();

    await UserSettings.ensureExists(int.user.id);
    const guildCfg = await em.findOneOrFail(GuildConfig, { id: int.guildId });

    const locale = await VideoInfoCmd.getGuildLocale(int);

    const embed = await VideoInfoCmd.getVideoInfoEmbed({
      guildCfg,
      type,
      url: `https://youtu.be/${videoId}`,
      videoId,
      locale,
    });

    if(!embed)
      return int.editReply(useEmbedify(tr.for(locale, "commands.video_info.errors.foundNoVidInfo"), Col.Error));

    return int.editReply({ embeds: [embed] });
  }

  //#region s:parse video ID

  /** Parses a video URL or ID and returns the video ID or null */
  public static parseVideoId(video: string): string | null {
    try {
      let videoUrl;
      try {
        videoUrl = new URL(video);
      }
      catch {
        videoUrl = null;
      }

      let videoId;
      if(videoUrl) {
        if(!(allowedHosts.includes(videoUrl.hostname)))
          return null;

        videoId = videoUrl?.hostname === "youtu.be"
          ? videoUrl.pathname.slice(1)
          : videoUrl?.searchParams.get("v");
      }
      else
        videoId = video;

      return videoId?.match(/^[a-zA-Z0-9_-]+$/)
        ? videoId
        : null;
    }
    catch {
      return null;
    }
  }

  //#region s:get embed

  /** Returns an embed with information about the video */
  public static async getVideoInfoEmbed({
    url,
    videoId,
    guildCfg,
    type = "reduced",
    omitTitleAndThumb = false,
    locale,
  }: VideoInfoFetchData): Promise<EmbedBuilder | null> {
    const embed = new EmbedBuilder()
      .setURL(url)
      .setColor(Col.Secondary);

    let hasRYDData = false,
      hasDeArrowData = false,
      hasSponsorBlockData = false;

    const { ytData, returnYTDislikeData, deArrowData, sponsorBlockData } = await VideoInfoCmd.fetchAllData(videoId, type);

    if(!ytData)
      return null;

    const t = tr.use(locale);

    //#SECTION title & thumbnail

    const bestDeArrowThumb = deArrowData?.thumbnails?.find(t => !t.original && (t.locked || t.votes > 0))
      ?? deArrowData?.thumbnails.find(t => !t.original)
      ?? null;

    const bestDeArrowTitle = deArrowData?.titles?.find(t => !t.original && (t.locked || t.votes > 0))
      ?? deArrowData?.titles.find(t => !t.original)
      ?? null;

    if(bestDeArrowThumb || bestDeArrowTitle)
      hasDeArrowData = true;

    if(!omitTitleAndThumb || type === "everything") {
      if(hasDeArrowData && bestDeArrowThumb && bestDeArrowThumb.timestamp)
        embed.setThumbnail(await VideoInfoCmd.getDeArrowThumbUrl(videoId, bestDeArrowThumb.timestamp) ?? ytData.thumbnail_url);
      else
        embed.setThumbnail(await getBestThumbnailUrl(videoId) ?? ytData.thumbnail_url);
    }

    if(type === "dearrow_only" && !hasDeArrowData)
      return null;

    hasDeArrowData && bestDeArrowTitle && embed.setTitle(bestDeArrowTitle.title);

    //#SECTION votes

    const fmt = (num: number) => formatNumber(num, guildCfg.locale, guildCfg.numberFormat);

    if(["votes_only", "everything", "reduced"].includes(type) && returnYTDislikeData) {
      hasRYDData = true;

      const likes = returnYTDislikeData?.likes ?? 0;
      const dislikes = returnYTDislikeData?.dislikes ?? 0;
      const ratioPerc = (returnYTDislikeData?.rating ?? 0) * 20;

      const ratioPercent = ratioPerc.toFixed(1);

      embed.addFields({
        name: t("commands.video_info.embedFields.votes"),
        value: `${fmt(likes)} 👍  •  ${fmt(dislikes)} 👎\n${generateEmojiProgressBar(ratioPerc, 7)} ${ratioPercent}%`,
        inline: true,
      });
    }

    //#SECTION video duration

    const duration = deArrowData?.videoDuration ?? undefined;

    if(typeof duration === "number") {
      embed.addFields({
        name: t("commands.video_info.embedFields.duration"),
        value: secsToTimeStr(duration, locale),
        inline: true,
      });
    }

    //#SECTION sponsorblock

    if(["timestamps_only", "everything"].includes(type) && sponsorBlockData) {
      let timestampList = "";

      const filteredSegments = sponsorBlockData.filter(seg => seg.locked || seg.votes > 0);
      const filteredSegmentCategories = new Set(filteredSegments.map(seg => seg.category));

      const unverifiedSegments = sponsorBlockData
        .filter(seg => !filteredSegmentCategories.has(seg.category))
        .sort((a, b) => b.votes - a.votes);

      const sortedSegments = [...filteredSegments, ...unverifiedSegments]
        .filter(seg => ["skip", "mute", "poi"].includes(seg.actionType))
        .sort((a, b) => a.segment[0] - b.segment[0]);

      // bring actionType=poi to the top
      const reorderedSegments = sortedSegments.sort((a, b) => {
        if(a.actionType === "poi" && b.actionType !== "poi")
          return -1;
        if(a.actionType !== "poi" && b.actionType === "poi")
          return 1;
        return 0;
      });

      // join segments together where segment[1] of the previous is the same as segment[0] of the next
      // join their names together too
      const concatenatedSegments = [...reorderedSegments] as (SponsorBlockSegmentObj & { categories: SponsorBlockCategory[] })[];
      // called recursively until no more segments can be joined
      const joinSegments = () => {
        let joinedSegs = 0;

        for(let i = 0; i < concatenatedSegments.length - 1; i++) {
          const left = concatenatedSegments[i];
          const right = concatenatedSegments[i + 1];

          if(valsWithin(left.segment[1], right.segment[0])) {
            left.segment[0] = Math.min(left.segment[0], right.segment[0]);
            left.segment[1] = Math.max(left.segment[1], right.segment[1]);
            if(!Array.isArray(left.categories))
              left.categories = [] as SponsorBlockCategory[];
            left.categories = [...new Set([left.category, ...left.categories, right.category])];
            concatenatedSegments.splice(i + 1, 1);
            joinedSegs++;
          }
        }

        if(joinedSegs === 0)
          return;
        return joinSegments();
      };
      joinSegments();

      for(const { segment, actionType, videoDuration, ...rest } of concatenatedSegments) {
        hasSponsorBlockData = true;

        const categories = [...("categories" in rest ? rest.categories as SponsorBlockCategory[] : [(rest as SponsorBlockSegmentObj).category])];

        const catList = joinArrayReadable(
          categories.map(cat => `${sponsorBlockCategoryColorEmojiMap[cat]} ${t(`commands.video_info.embedFields.sponsorBlockCategories.${cat as "sponsor"}`)}`),
          t("general.listSeparator"),
          t("general.listSeparator"),
        );

        const atVidEnd = valsWithin(segment[1], videoDuration);

        if(actionType === "poi") {
          const startUrl = new URL(url);
          startUrl.searchParams.set("t", String(Math.floor(segment[0])));

          timestampList += `[\`${secsToYtTime(segment[0])}\`](${startUrl}) ${catList}\n`;
        }
        else {
          const endUrl = new URL(url);
          endUrl.searchParams.set("t", String(Math.floor(segment[1])));

          timestampList += `\`${secsToYtTime(segment[0])}\`-${atVidEnd ? "" : "["}\`${secsToYtTime(segment[1])}\`${atVidEnd ? "" : `](${endUrl})`} ${catList}\n`;
        }
      }

      embed.addFields({
        name: t("commands.video_info.embedFields.timestamps"),
        value: timestampList,
        inline: false,
      });
    }

    !omitTitleAndThumb && !embed.data.title && embed.setTitle(ytData.title ?? `https://youtu.be/${videoId}`);

    //#SECTION footer

    const poweredByStr = [
      ...(hasRYDData ? ["ReturnYouTubeDislike"] : []),
      ...(hasDeArrowData ? ["SponsorBlock"] : []),
      ...(hasSponsorBlockData ? ["DeArrow"] : []),
    ];

    if(poweredByStr.length === 0)
      return null;

    // TODO: translate
    embed.setFooter({
      text: `Powered by ${joinArrayReadable(poweredByStr, t("general.listSeparator"), t("general.listSeparatorLast"))}`,
    });

    return embed;
  }

  //#region s:fetch all data

  /** Fetches all necessary data for a video given its ID and the info type - parallelizes the XHRs */
  public static async fetchAllData(videoId: string, type: VideoInfoType) {
    const noop = () => Promise.resolve(null);

    // only fetch the data that is needed - the rest immediately resolves null
    const [ytData, deArrowData, returnYTDislikeData, sponsorBlockData] = (
      await Promise.allSettled([
        VideoInfoCmd.fetchYouTubeData(videoId),
        ["dearrow_only", "everything"].includes(type) ? VideoInfoCmd.fetchDeArrowData(videoId) : noop(),
        ["votes_only", "everything", "reduced"].includes(type) ? VideoInfoCmd.fetchReturnYouTubeDislikeData(videoId) : noop(),
        ["timestamps_only", "everything"].includes(type) ? VideoInfoCmd.fetchSponsorBlockData(videoId) : noop(),
      ])
    ).map((res) => res.status === "fulfilled" ? res.value : null);

    return {
      ytData,
      deArrowData,
      returnYTDislikeData,
      sponsorBlockData,
    } as {
      ytData: YTVidDataObj | null;
      deArrowData: DeArrowObj | null;
      returnYTDislikeData: ReturnYouTubeDislikeObj | null;
      sponsorBlockData: SponsorBlockSegmentObj[] | null;
    };
  }

  //#region s:YT data

  /** Fetches YouTube data for a video */
  public static async fetchYouTubeData(videoId: string) {
    const { data, status } = await axios.get<YTVidDataObj>(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`);

    if(status < 200 || status >= 300)
      return null;

    if(!data.title || !data.author_name || !data.thumbnail_url)
      return null;

    return data;
  }

  //#region s:DeArrow

  /** Fetches DeArrow data for a video */
  public static async fetchDeArrowData(videoId: string) {
    try {
      const { data, status } = await axios.get<DeArrowObj>(`https://sponsor.ajay.app/api/branding?videoID=${videoId}`);

      if(status < 200 || status >= 300)
        return null;

      if(!data.titles || !Array.isArray(data.titles) || !data.thumbnails || !Array.isArray(data.thumbnails))
        return null;

      return data;
    }
    catch(err) {
      if(err instanceof AxiosError)
        return null;
    }
  }

  /** Returns the DeArrow thumbnail URL for a video with the given time (time has to be from one of the results of {@linkcode fetchDeArrowData()}) */
  public static async getDeArrowThumbUrl(videoId: string, time: number) {
    try {
      const url = `https://dearrow-thumb.ajay.app/api/v1/getThumbnail?videoID=${videoId}&time=${time}`;
      const { status } = await axios.head(url);

      if(status < 200 || status >= 300)
        return null;

      return url;
    }
    catch(err) {
      if(err instanceof AxiosError)
        return null;
    }
  }

  //#region s:RetYTDislike

  /** Fetches ReturnYouTubeDislike data for a video */
  public static async fetchReturnYouTubeDislikeData(videoId: string) {
    try {
      const { data, status } = await axios.get<ReturnYouTubeDislikeObj>(`https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`);

      if(status < 200 || status >= 300)
        return null;

      if(!data.likes || !data.dislikes)
        return null;

      return data;
    }
    catch(err) {
      if(err instanceof AxiosError)
        return null;
    }
  }

  //#region s:SponsorBlock

  /** Fetches SponsorBlock data for a video */
  public static async fetchSponsorBlockData(
    videoId: string,
    categories: SponsorBlockCategory[] = defaultSbCategories,
    actionTypes: SponsorBlockActionType[] = defaultSbActionTypes
  ) {
    try {
      const catParam = `["${categories.join("\",\"")}"]`;
      const actTypeParam = `["${actionTypes.join("\",\"")}"]`;

      const { data, status } = await axios.get<SponsorBlockSegmentObj[]>("https://sponsor.ajay.app/api/skipSegments", {
        params: {
          videoID: videoId,
          categories: catParam,
          actionTypes: actTypeParam,
        },
        // because sponsorblock for some idiotic reason requires ?this=["stupid","format"]
        paramsSerializer: params => qs.stringify(params, { encode: false }),
      });

      if(status < 200 || status >= 300)
        return null;

      if(!Array.isArray(data) || data.length === 0 || data.some(seg => !seg.category))
        return null;

      return data;
    }
    catch(err) {
      if(err instanceof AxiosError)
        return null;
    }
  }
}
