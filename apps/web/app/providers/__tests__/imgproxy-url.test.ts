import { describe, expect, it } from "vitest";
import { base64Url, buildImgproxyUrl } from "../imgproxy-url";

const SRC = "https://s3.twcstorage.ru/37651e87-bureau/uploads/foo.jpg";
const BASE = "http://localhost:8088";

describe("base64Url", () => {
  it("кодирует url-safe без паддинга", () => {
    const out = base64Url(SRC);
    expect(out).not.toMatch(/[+/=]/);
    expect(out).toBe(
      Buffer.from(SRC, "utf-8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, ""),
    );
  });
});

describe("buildImgproxyUrl", () => {
  it("строит resize(fill) + quality + base64 источник", () => {
    const url = buildImgproxyUrl(SRC, { width: 800, quality: 80 }, BASE);
    expect(url).toBe(`${BASE}/unsafe/rs:fill:800:0/q:80/${base64Url(SRC)}`);
  });

  it("маппит fit=contain → fit и пробрасывает height", () => {
    const url = buildImgproxyUrl(SRC, { width: 400, height: 300, fit: "contain" }, BASE);
    expect(url).toContain("/unsafe/rs:fit:400:300/");
  });

  it("без размеров — только источник", () => {
    expect(buildImgproxyUrl(SRC, {}, BASE)).toBe(`${BASE}/unsafe/${base64Url(SRC)}`);
  });

  it("срезает хвостовой слэш baseURL", () => {
    expect(buildImgproxyUrl(SRC, {}, `${BASE}/`)).toBe(`${BASE}/unsafe/${base64Url(SRC)}`);
  });
});
