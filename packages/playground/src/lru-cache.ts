import { LRUCache } from "lru-cache";

export class LruCache<TKey extends {}, TValue extends {}> {
  readonly #store: LRUCache<TKey, TValue>;

  constructor(capacity: number) {
    if (!Number.isFinite(capacity) || capacity <= 0) {
      throw new Error("capacity must be a positive integer");
    }

    this.#store = new LRUCache<TKey, TValue>({
      max: Math.floor(capacity),
    });
  }

  get(key: TKey): TValue | undefined {
    return this.#store.get(key);
  }

  set(key: TKey, value: TValue): void {
    this.#store.set(key, value);
  }

  clear(): void {
    this.#store.clear();
  }
}
