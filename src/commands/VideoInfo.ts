import { useEmbedify } from "@utils/embedify.ts";
import { SlashCommand } from "@utils/SlashCommand.ts";
import { SlashCommandBuilder, type APIApplicationCommandOptionChoice, type CommandInteraction } from "discord.js";

const choices: APIApplicationCommandOptionChoice<string>[] = [
  { name: "Reduced", value: "reduced" }, // (default)
  { name: "All", value: "all" },
  { name: "Votes only", value: "votes_only" },
  { name: "DeArrow only", value: "dearrow_only" },
  { name: "Timestamps only", value: "timestamps_only" }
] as const;

// type ChoiceValues = typeof choices[number]["value"];

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
          .addChoices(choices)
      )
    );
  }

  async run(int: CommandInteraction) {
    if(!int.inGuild())
      return int.reply(useEmbedify("This command can only be used in a server"));

    const videoId = this.parseVideoId(int.options.get("video", true).value as string);

    if(!videoId)
      return int.reply(useEmbedify("Invalid video URL or ID"));

    const type = int.options.get("type")?.value ?? "reduced";

    await int.deferReply();

    console.log("#> VideoInfo", type, videoId);
  }

  protected parseVideoId(video: string): string | null {
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
        if(!(["www.youtube.com", "youtube.com", "music.youtube.com", "youtu.be"].includes(videoUrl.hostname)))
          return null;

        videoId = videoUrl?.hostname === "youtu.be"
          ? videoUrl.pathname.slice(1)
          : videoUrl?.searchParams.get("v");
      }
      else if(video?.match(/^[a-zA-Z0-9_-]+$/))
        videoId = video;

      return videoId ?? null;
    }
    catch {
      return null;
    }
  }
}
