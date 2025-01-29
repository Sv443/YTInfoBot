import { Event } from "@lib/Event.js";

export class TemplateEvt extends Event {
  constructor() {
    super("ready");
  }

  //#region pb:run

  public async run(...args: unknown[]) {
    void args;
  }
}
