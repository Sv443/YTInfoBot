//#region misc

/** Any value that can be implicitly converted to a string with `String(val)`, `val.toString()` or \``${val}`\` */
export type Stringifiable = string | number | boolean | null | undefined | { toString(): string } | Stringifiable[];

/** Any class reference that can be instantiated with `new` */
export type Newable<T> = new (...args: any[]) => T;

//#region YT data

export type YTVidDataObj = {
  /** Video title */
  title: string;
  /** Channel name */
  author_name: string;
  /** Channel URL */
  author_url: string;
  /** Video type */
  type: "video";
  /** Embed height */
  height: number;
  /** Embed width */
  width: number;
  version: string;
  provider_name: "YouTube";
  provider_url: "https://www.youtube.com/";
  /** Video thumbnail height */
  thumbnail_height: number;
  /** Video thumbnail width */
  thumbnail_width: number;
  /** Video thumbnail URL */
  thumbnail_url: string;
  /** Embed HTML */
  html: string;
}

//#region SponsorBlock

export type SponsorBlockCategory =
  | "sponsor"
  | "selfpromo"
  | "interaction"
  | "intro"
  | "outro"
  | "preview"
  | "music_offtopic"
  | "filler";

export type SponsorBlockActionType =
  | "skip"
  | "mute"
  | "full"
  | "poi"
  | "chapter";

/** Returned in an array by `/api/skipSegments` */
export type SponsorBlockSegmentObj = {
  /** Segment category */
  category: SponsorBlockCategory;
  /** Segment action type */
  actionType: SponsorBlockActionType;
  /** Segment start and end time */
  segment: [start: number, end: number];
  /** Segment UUID */
  UUID: string;
  /** Video duration in seconds */
  videoDuration: number;
  /** Whether segments can be altered */
  locked: number;
  /** Score of up- and downvotes on the segment */
  votes: number;
  /** Chapter name when actionType is "chapter", else an empty string */
  description: string;
}

//#region ReturnYTDislike

/** Returned by `/votes` */
export type ReturnYouTubeDislikeObj = {
  /** Video ID */
  id: string;
  /** ISO timestamp of when the video was uploaded */
  dateCreated: string;
  /** Amount of likes; estimate */
  likes: number;
  /** Raw amount of likes */
  rawLikes: number;
  /** Amount of dislikes; estimate */
  dislikes: number;
  /** Raw amount of dislikes */
  rawDislikes: number;
  /** Rating from 0-5 */
  rating: number;
  /** Amount of views */
  viewCount: number;
  /** Whether the video is deleted */
  deleted: boolean;
}

//#region DeArrow

export type DeArrowTitle = {
  /** Title of the segment - if a word is prefixed with `>`, it indicates that word should not be auto-formatted and can be replaced with an empty string */
  title: string;
  /** Whether the title is the original one */
  original: boolean;
  /** Score of up- and downvotes on the title */
  votes: number;
  /** Whether the title can be altered */
  locked: boolean;
  /** Title UUID */
  UUID: string;
}

export type DeArrowThumbnail = {
  /** Score of up- and downvotes on the thumbnail */
  votes: number;
  /** Whether the thumbnail can be altered */
  locked: boolean;
  /** Thumbnail UUID */
  UUID: string;
} & (
  | {
    /** Thumbnail timestamp in seconds (null if the only thumbnail is the original one) */
    timestamp: number;
    /** Whether the thumbnail is the original one */
    original: false;
  }
  | {
    /** Thumbnail timestamp in seconds (null if the only thumbnail is the original one) */
    timestamp: null;
    /** Whether the thumbnail is the original one */
    original: true;
  }
)

/** Returned by `/api/branding` */
export type DeArrowObj = {
  /** Video titles - sorted by quality */
  titles: DeArrowTitle[];
  /** Video thumbnails - sorted by quality */
  thumbnails: DeArrowThumbnail[];
  /** API-generated value between 0 and 1 to be multiplied by video duration to get a consistent random video time per video */
  randomTime: number;
  /** Video duration in seconds, if known by the API */
  videoDuration: number | null;
}
