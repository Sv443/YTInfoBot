import { EmbedBuilder, SlashCommandBuilder, type APIApplicationCommandOptionChoice, type CommandInteraction } from "discord.js";
import { AxiosError } from "axios";
import qs from "qs";
import { EbdColors, useEmbedify } from "@lib/embedify.ts";
import { SlashCommand } from "@lib/SlashCommand.ts";
import { axios } from "@lib/axios.ts";
import type { DeArrowObj, ReturnYouTubeDislikeObj, SponsorBlockActionType, SponsorBlockCategory, SponsorBlockSegmentObj, YTVidDataObj } from "@/types.ts";
import { generateProgressBar, joinArrayReadable, secToYtTime } from "@lib/text.ts";
import { getBestThumbnailUrl } from "@lib/thumbnail.ts";
import { GuildConfig } from "@models/GuildConfig.model.ts";
import { formatNumber } from "@lib/math.ts";

//#region constants

const allowedHosts = ["www.youtube.com", "youtube.com", "music.youtube.com", "youtu.be"];

export const videoInfoTypeChoices: APIApplicationCommandOptionChoice<VideoInfoType>[] = [
  { name: "Reduced", value: "reduced" }, // (default)
  { name: "Everything", value: "everything" },
  { name: "Votes only", value: "votes_only" },
  { name: "DeArrow only", value: "dearrow_only" },
  { name: "Timestamps only", value: "timestamps_only" }
] as const;

export const numberFormatChoices: APIApplicationCommandOptionChoice<NumberFormat>[] = [
  { name: "Long", value: "long" }, // (default)
  { name: "Short", value: "short" },
] as const;

export const sponsorBlockCategoryMap = {
  sponsor: "Sponsored ad",
  selfpromo: "Self- / Unpaid promo",
  interaction: "Interaction reminder",
  intro: "Intro / Intermission",
  outro: "Outro / Endcards",
  preview: "Preview / Recap",
  music_offtopic: "Non-music section",
  filler: "Filler / Off-topic",
} as const satisfies Record<SponsorBlockCategory, string>;

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
}

//#region constructor

export class VideoInfo extends SlashCommand {
  constructor() {
    super(new SlashCommandBuilder()
      .setName("video_info")
      .setDescription("Show information about a video, given its URL")
      .addStringOption(opt =>
        opt.setName("video")
          .setDescription("URL to the video or video ID - supports music.youtube.com, youtube.com and youtu.be URLs")
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName("type")
          .setDescription("Type of information to show - defaults to reduced")
          .addChoices(videoInfoTypeChoices)
      )
    );
  }

  //#region run

  async run(int: CommandInteraction) {
    if(!int.inGuild())
      return int.reply(useEmbedify("This command can only be used in a server", EbdColors.Error));

    const videoId = VideoInfo.parseVideoId(int.options.get("video", true).value as string);

    if(!videoId)
      return int.reply(useEmbedify("Invalid video URL or ID", EbdColors.Error));

    const type = (int.options.get("type")?.value ?? "reduced") as VideoInfoType;

    await int.deferReply();

    console.log("#> VideoInfo", type, videoId);
  }

  //#region parse video ID

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

  //#region get embed

  /** Returns an embed with information about the video */
  public static async getVideoInfoEmbed({
    url,
    videoId,
    guildCfg,
    type = "reduced",
  }: VideoInfoFetchData): Promise<EmbedBuilder | null> {
    const embed = new EmbedBuilder()
      .setURL(url)
      .setColor(EbdColors.Secondary);

    const { ytData, returnYTDislikeData, deArrowData, sponsorBlockData } = await VideoInfo.fetchAllData(videoId, type);

    if(!ytData)
      return null;

    //#SECTION title & thumbnail

    embed.setTitle(ytData.title ?? url);

    const bestDeArrowThumb = deArrowData?.thumbnails?.find(t => !t.original && (t.locked || t.votes > 0))
      ?? deArrowData?.thumbnails.find(t => !t.original)
      ?? null;

    if(bestDeArrowThumb && bestDeArrowThumb.timestamp)
      embed.setThumbnail(await VideoInfo.getDeArrowThumbUrl(videoId, bestDeArrowThumb.timestamp) ?? ytData.thumbnail_url);
    else
      embed.setThumbnail(await getBestThumbnailUrl(videoId) ?? ytData.thumbnail_url);

    const bestDeArrowTitle = deArrowData?.titles?.find(t => !t.original && (t.locked || t.votes > 0))
      ?? deArrowData?.titles.find(t => !t.original)
      ?? null;

    if(type === "dearrow_only" && !bestDeArrowTitle)
      return null;

    bestDeArrowTitle && embed.addFields({
      name: "Alternative title:",
      value: bestDeArrowTitle.title,
      inline: false,
    });

    //#SECTION votes

    const fmt = (num: number) => formatNumber(num, guildCfg.locale, guildCfg.numberFormat);

    if(["votes_only", "everything", "reduced"].includes(type) && returnYTDislikeData) {
      const likes = returnYTDislikeData?.likes ?? 0;
      const dislikes = returnYTDislikeData?.dislikes ?? 0;
      const ratioPerc = (returnYTDislikeData?.rating ?? 0) * 20;

      const ratioPercent = ratioPerc.toFixed(1);

      embed.addFields({
        name: "Votes (estimated):",
        value: `${fmt(likes)} 👍  •  ${fmt(dislikes)} 👎\n${generateProgressBar(ratioPerc, 14)} ${ratioPercent}%`,
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

      for(const { category, segment, actionType } of reorderedSegments) {
        const startUrl = new URL(url);
        startUrl.searchParams.set("t", String(Math.floor(segment[0])));
        const endUrl = new URL(url);
        endUrl.searchParams.set("t", String(Math.floor(segment[1])));

        if(actionType === "poi")
          timestampList += `${sponsorBlockCategoryColorEmojiMap[category]} [${secToYtTime(segment[0])}](${startUrl}) (${sponsorBlockCategoryMap[category]})\n`;
        else
          timestampList += `${sponsorBlockCategoryColorEmojiMap[category]} [${secToYtTime(segment[0])}](${startUrl})-[${secToYtTime(segment[1])}](${endUrl}) (${sponsorBlockCategoryMap[category]})\n`;
      }

      embed.addFields({
        name: "Timestamps:",
        value: timestampList,
        inline: false,
      });
    }

    //#SECTION footer

    const poweredBy = {
      returnYTDislike: "ReturnYouTubeDislike",
      sponsorBlock: "SponsorBlock",
      deArrow: "DeArrow",
    };

    const footers: Record<VideoInfoType, string> = {
      everything: joinArrayReadable(Object.values(poweredBy)),
      reduced: joinArrayReadable([poweredBy.returnYTDislike, poweredBy.deArrow]),
      votes_only: poweredBy.returnYTDislike,
      dearrow_only: poweredBy.deArrow,
      timestamps_only: poweredBy.sponsorBlock,
    };

    embed.setFooter({ text: `Powered by ${footers[type]}` });

    return embed;
  }

  //#region fetch all data

  /** Fetches all necessary data for a video, given a type - parallelizes the requests */
  public static async fetchAllData(videoId: string, type: VideoInfoType) {
    const getNullPromise = () => Promise.resolve(null);

    const [ytData, deArrowData, returnYTDislikeData, sponsorBlockData] = (
      await Promise.allSettled([
        VideoInfo.fetchYouTubeData(videoId),
        ["dearrow_only", "everything"].includes(type) ? VideoInfo.fetchDeArrowData(videoId) : getNullPromise(),
        ["votes_only", "everything", "reduced"].includes(type) ? VideoInfo.fetchReturnYouTubeDislikeData(videoId) : getNullPromise(),
        ["timestamps_only", "everything"].includes(type) ? VideoInfo.fetchSponsorBlockData(videoId) : getNullPromise(),
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

  //#region YT data

  /** Fetches YouTube data for a video */
  public static async fetchYouTubeData(videoId: string) {
    const { data, status } = await axios.get<YTVidDataObj>(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`);

    if(status < 200 || status >= 300)
      return null;

    if(!data.title || !data.author_name || !data.thumbnail_url)
      return null;

    return data;
  }

  //#region DeArrow

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

  //#region ReturnYTDislike

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

  //#region SponsorBlock

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
