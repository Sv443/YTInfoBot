import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

@Entity()
export class UserSettings {
  constructor(id: string) {
    this.id = id;
  }

  @PrimaryKey({ type: "string", length: 24 })
    id!: string;

  @Property({ type: "bool" })
    autoReplyEnabled: boolean = true;
}
