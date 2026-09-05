import type { Memory, MemoryType } from "./types.js";
import type { StorageAdapter } from "./storage.js";
import { EventBus } from "./eventBus.js";

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter(Boolean)
  );
}

export class MemoryManager {
  private memories: Memory[] = [];

  constructor(
    private storage: StorageAdapter,
    private bus: EventBus
  ) {}

  async init(): Promise<void> {
    this.memories =
      (await this.storage.get<Memory[]>("memories")) ?? [];
  }

  async add(
    type: MemoryType,
    text: string,
    options?: {
      tags?: string[];
      importance?: number;
      confidence?: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<Memory> {
    const now = Date.now();

    const memory: Memory = {
      id: crypto.randomUUID(),
      type,
      text,
      tags: options?.tags ?? [],
      importance: options?.importance ?? 0.5,
      confidence: options?.confidence ?? 0.8,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      metadata: options?.metadata
    };

    this.memories.unshift(memory);

    await this.storage.set("memories", this.memories);

    this.bus.emit("MEMORY_UPDATED", memory);

    return memory;
  }

  async search(
    query: string,
    limit = 8
  ): Promise<Memory[]> {
    const queryTokens = tokenize(query);
    const now = Date.now();

    const ranked = this.memories
      .map((memory) => {
        const tokens = tokenize(
          `${memory.text} ${memory.tags.join(" ")}`
        );

        let overlap = 0;

        for (const token of queryTokens) {
          if (tokens.has(token)) overlap++;
        }

        const age =
          (now - memory.lastAccessedAt) /
          (1000 * 60 * 60 * 24 * 30);

        const recency = Math.max(0, 1 - age);

        const score =
          overlap * 2 +
          memory.importance * 1.5 +
          memory.confidence +
          recency;

        return { memory, score };
      })
      .filter((item) => item.score > 1.25)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    for (const item of ranked) {
      item.memory.lastAccessedAt = now;
    }

    await this.storage.set("memories", this.memories);

    const memories = ranked.map((item) => item.memory);

    this.bus.emit("MEMORY_RETRIEVED", memories);

    return memories;
  }

  async forget(id: string): Promise<void> {
    this.memories = this.memories.filter(
      (memory) => memory.id !== id
    );

    await this.storage.set("memories", this.memories);

    this.bus.emit("MEMORY_UPDATED", {
      forgottenId: id
    });
  }

  all(): Memory[] {
    return [...this.memories];
  }
}
