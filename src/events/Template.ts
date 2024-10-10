import { Event } from "@lib/Event.ts";

export class TemplateEvent extends Event {
  constructor() {
    super("ready");
  }

  //#region pb:run

  public async run(...args: unknown[]) {
    void args;
  }
}
