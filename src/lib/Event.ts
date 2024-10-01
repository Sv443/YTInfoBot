import type { ClientEvents } from "discord.js";

export abstract class Event<TEventName extends keyof ClientEvents = keyof ClientEvents> {
  public readonly name: TEventName;
  public readonly once: boolean;

  constructor(name: TEventName, once = false) {
    this.name = name;
    this.once = once;
  }

  /** The method that will be called when the event is emitted */
  public abstract run(...args: unknown[]): Promise<unknown | void>;
}
