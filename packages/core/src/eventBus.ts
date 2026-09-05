import type { EventType, JarvisEvent } from "./types.js";

export class EventBus {
  private listeners =
    new Map<EventType, Set<(event: JarvisEvent) => void>>();

  emit<T>(
    type: EventType,
    payload: T,
    source: "web" | "android" | "core" = "core"
  ): JarvisEvent<T> {
    const event: JarvisEvent<T> = {
      id: crypto.randomUUID(),
      type,
      timestamp: Date.now(),
      source,
      payload
    };

    for (const listener of this.listeners.get(type) ?? []) {
      listener(event as JarvisEvent);
    }

    return event;
  }

  on(
    type: EventType,
    listener: (event: JarvisEvent) => void
  ): () => void {
    let listeners = this.listeners.get(type);

    if (!listeners) {
      listeners = new Set();
      this.listeners.set(type, listeners);
    }

    listeners.add(listener);

    return () => listeners?.delete(listener);
  }
}
