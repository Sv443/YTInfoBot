import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import type { NumberFormat, VideoInfoType } from "@cmd/VideoInfo.ts";
import localesJson from "@assets/locales.json" with { type: "json" };

@Entity()
export class GuildConfig {
  constructor(id: string) {
    this.id = id;
  }

  @PrimaryKey({ type: "string", length: 24 })
    id!: string;

  // TODO: convert to bitfield
  @Property({ type: "string", length: 24 })
    defaultVideoInfoType: VideoInfoType = "reduced";

  // TODO: convert to bitfield
  @Property({ type: "string", length: 12 })
    numberFormat: NumberFormat = "long";

  @Property({ type: "string", length: 5 })
    locale: (typeof localesJson)[number]["code"] = "en-US";

  @Property({ type: "bool" })
    autoReplyEnabled: boolean = true;
}
