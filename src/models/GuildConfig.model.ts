import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { em } from "@lib/db.js";
import type { NumberFormat, VideoInfoType } from "@cmd/VideoInfo.js";
import localesJson from "@assets/locales.json" with { type: "json" };

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

  @Property({ type: "datetime", nullable: true })
    lastAccessed: Date = new Date();
}
