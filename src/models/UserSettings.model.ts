import { em } from "@lib/db.ts";
import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

@Entity()
export class UserSettings {
  constructor(id: string) {
    this.id = id;
  }

  /** Ensures that a UserSettings entry exists for the given user ID */
  static async ensureExists(id: string) {
    const sett = await em.findOne(UserSettings, { id });
    !sett && await em.persistAndFlush(new UserSettings(id));
  }

  @PrimaryKey({ type: "string", length: 24 })
    id!: string;

  @Property({ type: "bool" })
    autoReplyEnabled: boolean = true;
}
