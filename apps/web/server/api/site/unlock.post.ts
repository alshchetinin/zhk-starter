export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: string }>(event);
  if (!body?.password || typeof body.password !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Missing password" });
  }

  const host = getRequestHeader(event, "host") ?? "";
  const config = useRuntimeConfig();
  const serverUrl = config.public.serverUrl;

  const response = await fetch(`${serverUrl}/rpc/public/site/unlock`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-host": host,
    },
    body: JSON.stringify({ json: { password: body.password } }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.json?.message ?? "UNLOCK_FAILED";
    const retryAfterSec = payload?.json?.data?.retryAfterSec as number | undefined;
    throw createError({
      statusCode: response.status,
      statusMessage: message,
      data: { message, retryAfterSec },
    });
  }

  const setCookieHeaders =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : ([response.headers.get("set-cookie")].filter(Boolean) as string[]);

  for (const header of setCookieHeaders) {
    const firstPair = header.split(";")[0] ?? "";
    const eqIdx = firstPair.indexOf("=");
    if (eqIdx <= 0) continue;
    const name = firstPair.slice(0, eqIdx).trim();
    const value = decodeURIComponent(firstPair.slice(eqIdx + 1).trim());
    setCookie(event, name, value, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    });
  }

  return { ok: true };
});
