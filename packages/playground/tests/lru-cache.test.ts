import { describe, expect, it } from "vitest";

import { LruCache } from "../src/lru-cache";

describe("LruCache", () => {
  it("超出容量后应淘汰最久未使用条目", () => {
    const cache = new LruCache<string, number>(2);

    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a");
    cache.set("c", 3);

    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe(3);
  });

  it("clear 后应清空缓存", () => {
    const cache = new LruCache<string, number>(2);

    cache.set("a", 1);
    cache.clear();

    expect(cache.get("a")).toBeUndefined();
  });

  it("容量非法时应抛错", () => {
    expect(() => {
      new LruCache<string, number>(0);
    }).toThrow("capacity must be a positive integer");
  });
});
