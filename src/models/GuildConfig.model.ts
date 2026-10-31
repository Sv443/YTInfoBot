import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { em } from "@lib/db.js";
import type { NumberFormat, VideoInfoType } from "@cmd/VideoInfo.js";
import localesJson from "@assets/locales.json" with { type: "json" };

/** Lowest allowed value of `GuildConfig.linksPerReplyLimit` */
export const linksPerReplyLimitMin = 1;
/** Highest allowed value of `GuildConfig.linksPerReplyLimit` (Discord allows a maximum of 10 embeds per message) */
export const linksPerReplyLimitMax = 10;

/** Checks whether the passed value is a valid `GuildConfig.linksPerReplyLimit` */
export const isValidLinksPerReplyLimit = (val: unknown): val is number =>
  typeof val === "number"
  && Number.isSafeInteger(val)
  && val >= linksPerReplyLimitMin
  && val <= linksPerReplyLimitMax;

@Entity()
export class GuildConfig {
  constructor(id: string) {
    this.id = id;
  }

  static async ensureExists(id: string) {
    let exists = false;
    try {
      exists = Boolean(await em.findOne(GuildConfig, { id }));
    }
    catch(e) {
      void e;
    }
    !exists && await em.persistAndFlush(new GuildConfig(id));
  }

  /** Clamps all out-of-bounds values that are currently stored in the database back into their valid range */
  static async sanitizeAll() {
    const fork = em.fork();
    const tooLow = await fork.nativeUpdate(GuildConfig, { linksPerReplyLimit: { $lt: linksPerReplyLimitMin } }, { linksPerReplyLimit: linksPerReplyLimitMin });
    const tooHigh = await fork.nativeUpdate(GuildConfig, { linksPerReplyLimit: { $gt: linksPerReplyLimitMax } }, { linksPerReplyLimit: linksPerReplyLimitMax });
    return tooLow + tooHigh;
  }

  @PrimaryKey({ type: "string", length: 24 })
    id!: string;

  @Property({ type: "string", length: 24 })
    defaultVideoInfoType: VideoInfoType = "everything";

  @Property({ type: "string", length: 12 })
    numberFormat: NumberFormat = "long";

  @Property({ type: "string", length: 5 })
    locale: (typeof localesJson)[number]["code"] = "en-US";

  @Property({ type: "bool" })
    autoReplyEnabled: boolean = true;

  @Property({ type: "number" })
    linksPerReplyLimit: number = 5;

  @Property({ type: "datetime", nullable: true })
    lastAccessed: Date = new Date();
}
