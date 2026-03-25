/**
 * 通用类型守卫和响应解析工具。
 * 从 client-utils.ts、search-api.ts、hot-ga4.ts 中提取的公共逻辑。
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return { message: "Response body is not valid JSON" };
    }
  }

  return await response.text();
}
