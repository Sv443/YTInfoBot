import type { AxiosResponse } from "axios";
import { axios } from "@lib/axios.ts";

/** Quality identifier for a thumbnail - from highest to lowest res: `maxresdefault` > `sddefault` > `hqdefault` > `mqdefault` > `default` */
export type ThumbQuality = `${"maxres" | "sd" | "hq" | "mq" | ""}default`;

/** Returns the thumbnail URL for a video with the given video ID and quality (defaults to "hqdefault") */
export function getThumbnailUrl(videoId: string, quality?: ThumbQuality): string
/** Returns the thumbnail URL for a video with the given video ID and index (0 is low quality thumbnail, 1-3 are low quality frames from the video) */
export function getThumbnailUrl(videoId: string, index: 0 | 1 | 2 | 3): string
/** Returns the thumbnail URL for a video with either a given quality identifier or index */
export function getThumbnailUrl(videoId: string, qualityOrIndex: ThumbQuality | 0 | 1 | 2 | 3 = "maxresdefault") {
  return `https://img.youtube.com/vi/${videoId}/${qualityOrIndex}.jpg`;
}

/** Returns the best available thumbnail URL for a video with the given video ID */
export async function getBestThumbnailUrl(videoId: string) {
  try {
    const priorityList = ["maxresdefault", "sddefault", "hqdefault", 0];

    for(const quality of priorityList) {
      let response: AxiosResponse | undefined;
      const url = getThumbnailUrl(videoId, quality as ThumbQuality);
      try {
        response = await axios.head(url);
      }
      catch {
        void 0;
      }
      if(response && response.status < 300 && response.status >= 200)
        return url;
    }
    return null;
  }
  catch {
    return null;
  }
}
