const tokenCache = new Map<string, { token: string; expiresAt: number }>();
const RATE_LIMIT_MS = 300;
let lastRequestAt = 0;

export interface ProfitbaseConfig {
  apiKey: string;
  accountId: string;
}

export interface ProfitbaseProject {
  id: number;
  title: string;
}

export interface ProfitbaseHouse {
  id: number;
  title: string;
  address?: string;
  maxFloor?: number;
  projectId?: number;
  developmentEndQuarter?: { year: number; quarter: number };
}

export interface ProfitbaseProperty {
  id: number;
  house_id: number;
  number: string;
  floor: number;
  rooms_amount: number | null;
  studio: boolean;
  propertyType: string;
  status: string;
  area: { area_total: number } | null;
  price: { value: number } | null;
  sectionName: string | null;
  sectionNumber: number | null;
  planImages: Array<{ source: string }> | null;
  layoutCode: string | null;
  projectId: number;
  projectName: string;
  developmentEndQuarter?: { year: number; quarter: number };
}

function baseUrl(accountId: string): string {
  return `https://pb${accountId}.profitbase.ru/api/v4/json`;
}

async function throttle() {
  const wait = RATE_LIMIT_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

async function authenticate(config: ProfitbaseConfig): Promise<string> {
  const cached = tokenCache.get(config.accountId);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  await throttle();
  const resp = await fetch(`${baseUrl(config.accountId)}/authentication`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "api-app",
      credentials: { pb_api_key: config.apiKey },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Profitbase auth failed: ${resp.status} ${text}`);
  }

  const data = (await resp.json()) as {
    access_token: string;
    remaining_time: number;
  };

  tokenCache.set(config.accountId, {
    token: data.access_token,
    expiresAt: Date.now() + data.remaining_time * 1000,
  });

  return data.access_token;
}

async function apiFetch(
  config: ProfitbaseConfig,
  path: string,
  params: Record<string, string | number> = {},
): Promise<unknown> {
  const token = await authenticate(config);
  const qs = new URLSearchParams({
    access_token: token,
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ),
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    await throttle();
    const resp = await fetch(`${baseUrl(config.accountId)}${path}?${qs}`);

    if (resp.status === 429) {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Profitbase ${path} failed: ${resp.status} ${text}`);
    }

    return resp.json();
  }

  throw new Error(`Profitbase ${path} failed after 3 attempts (rate limit)`);
}

export async function getProjects(
  config: ProfitbaseConfig,
): Promise<ProfitbaseProject[]> {
  const raw = await apiFetch(config, "/projects");
  if (Array.isArray(raw)) return raw as ProfitbaseProject[];
  if (raw && typeof raw === "object" && "data" in raw) {
    const data = (raw as { data?: ProfitbaseProject[] }).data;
    if (Array.isArray(data)) return data;
  }
  return [];
}

export async function getHouses(
  config: ProfitbaseConfig,
): Promise<ProfitbaseHouse[]> {
  const data = (await apiFetch(config, "/house")) as {
    data: ProfitbaseHouse[];
  };
  return data.data ?? [];
}

export async function getProperties(
  config: ProfitbaseConfig,
  projectIds: number[] = [],
): Promise<ProfitbaseProperty[]> {
  const targets = projectIds.length
    ? projectIds
    : (await getProjects(config)).map((p) => p.id);

  const all: ProfitbaseProperty[] = [];
  const pageSize = 100;

  for (const projectId of targets) {
    let offset = 0;
    for (;;) {
      const data = (await apiFetch(config, "/property", {
        projectId,
        isArchive: false,
        full: true,
        limit: pageSize,
        offset,
      })) as { data: ProfitbaseProperty[] };
      const chunk = data.data ?? [];
      all.push(...chunk);
      if (chunk.length < pageSize) break;
      offset += pageSize;
    }
  }

  return all;
}

export async function verifyConnection(
  config: ProfitbaseConfig,
): Promise<{ projectCount: number }> {
  const projects = await getProjects(config);
  return { projectCount: projects.length };
}
