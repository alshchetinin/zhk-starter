import { createHmac } from "node:crypto";
import type { Deliverer } from "../../shared/receivers";
import type { WebhookConfig } from "../../shared/receivers";

export function signBody(body: string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

export const deliverWebhook: Deliverer<WebhookConfig> = async (ctx, config) => {
  const body = JSON.stringify(ctx);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(config.headers ?? {}),
  };
  if (config.secret) headers["X-Signature"] = signBody(body, config.secret);

  try {
    const res = await fetch(config.url, {
      method: config.method ?? "POST",
      headers,
      body,
    });
    if (res.status >= 200 && res.status < 300) return { ok: true };
    const text = await res.text().catch(() => "");
    return { ok: false, error: `HTTP ${res.status} ${text}`.trim() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
};
