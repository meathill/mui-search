import { describe, expect, it, vi } from "vitest";
import { createWorkerApp } from "../src/app";
import { buildDependencies } from "./app-test-helpers";

describe("WP Search Routes — /api/wp/v2/search", () => {
  it("返回 WP 格式的搜索结果", async () => {
    const deps = buildDependencies();
    const app = createWorkerApp(deps);
    const res = await app.request("/api/wp/v2/search?search=TiDB");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toMatchObject({
      id: expect.any(Number),
      title: "TiDB Cloud",
      type: "post",
      subtype: "post",
    });
    expect(body[0].url).toBeDefined();
  });

  it("包含 X-WP-Total 和 X-WP-TotalPages 响应头", async () => {
    const deps = buildDependencies();
    const app = createWorkerApp(deps);
    const res = await app.request("/api/wp/v2/search?search=TiDB");

    expect(res.headers.get("X-WP-Total")).toBe("1");
    expect(res.headers.get("X-WP-TotalPages")).toBe("1");
  });

  it("搜索词过短时返回空数组", async () => {
    const deps = buildDependencies();
    const app = createWorkerApp(deps);
    const res = await app.request("/api/wp/v2/search?search=a");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
    expect(res.headers.get("X-WP-Total")).toBe("0");
  });

  it("无 search 参数时返回空数组", async () => {
    const deps = buildDependencies();
    const app = createWorkerApp(deps);
    const res = await app.request("/api/wp/v2/search");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("支持 per_page 参数", async () => {
    const deps = buildDependencies();
    const app = createWorkerApp(deps);
    await app.request("/api/wp/v2/search?search=TiDB&per_page=5");

    expect(deps.queryHybridSearch).toHaveBeenCalledWith("TiDB", 5, undefined);
  });

  it("支持 locale 参数", async () => {
    const deps = buildDependencies();
    const app = createWorkerApp(deps);
    await app.request("/api/wp/v2/search?search=TiDB&locale=zh");

    expect(deps.queryHybridSearch).toHaveBeenCalledWith("TiDB", 10, "zh");
  });

  it("支持 subtype 参数", async () => {
    const deps = buildDependencies();
    const app = createWorkerApp(deps);
    const res = await app.request("/api/wp/v2/search?search=TiDB&subtype=page");

    const body = await res.json();
    expect(body[0].subtype).toBe("page");
  });

  it("POST 方法返回 405", async () => {
    const deps = buildDependencies();
    const app = createWorkerApp(deps);
    const res = await app.request("/api/wp/v2/search", { method: "POST" });

    expect(res.status).toBe(405);
  });

  it("无搜索结果时返回空数组", async () => {
    const deps = buildDependencies({
      queryHybridSearch: vi.fn(async () => []),
    });
    const app = createWorkerApp(deps);
    const res = await app.request("/api/wp/v2/search?search=不存在的内容");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
    expect(res.headers.get("X-WP-Total")).toBe("0");
  });
});
