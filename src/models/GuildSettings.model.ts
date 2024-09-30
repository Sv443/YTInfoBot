import type { VideoInfoType } from "@/types.ts";
import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

@Entity()
export class GuildConfig {
  constructor(id: string) {
    this.id = id;
  }

  @PrimaryKey({ type: "string", length: 24 })
    id!: string;

  @Property({ type:"string", length: 24 })
    defaultVideoInfoType: VideoInfoType = "reduced";
}
