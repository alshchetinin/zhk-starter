import type { H3Event } from "h3";

/**
 * Server-side вызов публичной oRPC-процедуры с прокидыванием Host текущего
 * запроса — API резолвит сайт по x-forwarded-host (паттерн из api/site/unlock).
 * Любая ошибка → null: robots/sitemap деградируют до «не индексировать».
 */
export async function callPublicRpc<T>(event: H3Event, path: string): Promise<T | null> {
  const host = getRequestHeader(event, "host") ?? "";
  const config = useRuntimeConfig(event);

  try {
    const response = await fetch(`${config.public.serverUrl}/rpc/public/${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-host": host,
      },
      body: JSON.stringify({ json: {} }),
    });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    return (payload?.json ?? null) as T | null;
  } catch {
    return null;
  }
}
