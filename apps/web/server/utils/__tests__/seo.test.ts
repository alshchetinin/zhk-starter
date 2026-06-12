import { describe, expect, it } from "vitest";
import { buildRobotsTxt, buildSitemapXml } from "../seo";

describe("buildSitemapXml", () => {
  it("рендерит url с lastmod (только дата)", () => {
    const xml = buildSitemapXml([
      { loc: "https://x.ru/" },
      { loc: "https://x.ru/news/start", lastmod: "2026-06-01T10:00:00.000Z" },
    ]);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<loc>https://x.ru/</loc>");
    expect(xml).toContain("<loc>https://x.ru/news/start</loc><lastmod>2026-06-01</lastmod>");
  });

  it("экранирует XML-спецсимволы в loc", () => {
    const xml = buildSitemapXml([{ loc: "https://x.ru/p?a=1&b=2" }]);
    expect(xml).toContain("<loc>https://x.ru/p?a=1&amp;b=2</loc>");
  });

  it("пустой список — валидный пустой urlset", () => {
    const xml = buildSitemapXml([]);
    expect(xml).toContain("<urlset");
    expect(xml).not.toContain("<url>");
  });
});

describe("buildRobotsTxt", () => {
  it("индексируемый сайт: закрыт только /_preview, есть Sitemap", () => {
    const txt = buildRobotsTxt({ indexable: true, sitemapUrl: "https://x.ru/sitemap.xml" });
    expect(txt).toContain("User-agent: *");
    expect(txt).toContain("Disallow: /_preview");
    expect(txt).toContain("Sitemap: https://x.ru/sitemap.xml");
    expect(txt).not.toMatch(/Disallow: \/$/m);
  });

  it("неиндексируемый сайт: Disallow: /", () => {
    const txt = buildRobotsTxt({ indexable: false, sitemapUrl: "https://x.ru/sitemap.xml" });
    expect(txt).toMatch(/Disallow: \/$/m);
    expect(txt).not.toContain("Sitemap:");
  });
});
