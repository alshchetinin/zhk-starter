import { createHash } from "node:crypto";
import type { MacroFlat, MacroPromo, FloorPlans, MacroComplex } from "../types";

function macroToken(
  domain: string,
  appSecret: string,
): { token: string; time: number } {
  const time = Math.floor(Date.now() / 1000);
  const token = createHash("md5")
    .update(`${domain}${time}${appSecret}`)
    .digest("hex");
  return { token, time };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getMacroComplexes(
  domain: string,
  appSecret: string,
  apiDomain: string,
): Promise<MacroComplex[]> {
  const { token, time } = macroToken(domain, appSecret);
  const url = `https://${apiDomain}/estate/group/getComplexes/?token=${token}&domain=${domain}&time=${time}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `MacroCRM getComplexes failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as { complexes: MacroComplex[] };
  return data.complexes ?? [];
}

export async function getMacroRealty(
  integrationId: string,
  type: "living" | "comm",
  domain: string,
  appSecret: string,
  apiDomain: string,
  complexes: number[],
): Promise<MacroFlat[]> {
  const { token, time } = macroToken(domain, appSecret);

  let allData: MacroFlat[] = [];
  let hasMoreRecords = true;
  let startFrom: number | null = null;
  let pageNumber = 1;

  console.log(
    `[macro:${integrationId}] Fetching ${type} realty...`,
  );

  while (hasMoreRecords) {
    let url = `https://${apiDomain}/estate/get/?type=${type}&withdeals=1&limit=100&token=${token}&domain=${domain}&time=${time}`;

    if (startFrom) {
      url += `&start_from=${startFrom}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error(
        `[macro:${integrationId}] Unexpected API response format`,
      );
    }

    const lastRecord = data[data.length - 1];
    const records = data.slice(0, -1) as MacroFlat[];

    allData = [...allData, ...records];

    console.log(
      `[macro:${integrationId}] Page ${pageNumber}: ${records.length} records (total: ${allData.length})`,
    );

    if (lastRecord && lastRecord.last_record_id) {
      startFrom = lastRecord.last_record_id;
      pageNumber++;
    } else {
      hasMoreRecords = false;
    }

    if (hasMoreRecords) {
      await delay(500);
    }
  }

  let filteredData = allData;
  if (complexes.length) {
    filteredData = allData.filter((flat) =>
      complexes.includes(flat.complex_id),
    );
  }

  console.log(
    `[macro:${integrationId}] ${type}: ${allData.length} total, ${filteredData.length} after filter`,
  );

  return filteredData;
}

export async function getMacroFloorPlans(
  integrationId: string,
  domain: string,
  appSecret: string,
  apiDomain: string,
): Promise<FloorPlans> {
  const { token, time } = macroToken(domain, appSecret);
  const url = `https://${apiDomain}/estate/group/getFloorPlans/?token=${token}&domain=${domain}&time=${time}`;

  console.log(`[macro:${integrationId}] Fetching floor plans...`);

  const response = await fetch(url);
  return (await response.json()) as FloorPlans;
}

export async function getMacroPromos(
  domain: string,
  appSecret: string,
  apiDomain: string,
): Promise<MacroPromo[]> {
  const { token, time } = macroToken(domain, appSecret);
  const url = `https://${apiDomain}/estate/getPromos/?token=${token}&domain=${domain}&time=${time}`;

  const response = await fetch(url);
  return (await response.json()) as MacroPromo[];
}
