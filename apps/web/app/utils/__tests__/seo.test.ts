import { describe, expect, it } from "vitest";
import type { PublicSiteSeo } from "@zhk/api/shared/seo";
import { absolutizeUrl, canonicalUrl, resolvePageMeta } from "../seo";

function makeSeo(overrides: Partial<PublicSiteSeo> = {}): PublicSiteSeo {
  return {
    titleSuffix: null,
    defaultTitle: null,
    defaultDescription: null,
    defaultOgImage: null,
    favicon: null,
    indexable: true,
    yandexVerification: null,
    googleVerification: null,
    organization: {
      name: "ЖК Горизонт",
      legalName: null,
      logo: null,
      phone: null,
      email: null,
      address: null,
    },
    ...overrides,
  };
}

const ctx = {
  siteName: "ЖК Горизонт",
  origin: "https://gorizont.ru",
  path: "/news",
};

describe("absolutizeUrl", () => {
  it("абсолютный URL остаётся как есть", () => {
    expect(absolutizeUrl("https://cdn.io/a.png", "https://x.ru")).toBe("https://cdn.io/a.png");
  });
  it("корневой путь дополняется origin", () => {
    expect(absolutizeUrl("/img/a.png", "https://x.ru")).toBe("https://x.ru/img/a.png");
  });
  it("пустое значение — null", () => {
    expect(absolutizeUrl(null, "https://x.ru")).toBeNull();
    expect(absolutizeUrl("", "https://x.ru")).toBeNull();
  });
  it("строка из пробелов — null", () => {
    expect(absolutizeUrl("   ", "https://x.ru")).toBeNull();
  });
});

describe("canonicalUrl", () => {
  it("склеивает origin и path", () => {
    expect(canonicalUrl("https://x.ru", "/news")).toBe("https://x.ru/news");
  });
  it("убирает хвостовой слэш, кроме корня", () => {
    expect(canonicalUrl("https://x.ru", "/news/")).toBe("https://x.ru/news");
    expect(canonicalUrl("https://x.ru", "/")).toBe("https://x.ru/");
  });
});

describe("resolvePageMeta", () => {
  it("title страницы важнее дефолтов", () => {
    const meta = resolvePageMeta(
      { title: "Своя" },
      { ...ctx, seo: makeSeo({ defaultTitle: "Дефолт" }) },
    );
    expect(meta.title).toBe("Своя");
  });

  it("без title страницы — defaultTitle, затем имя сайта", () => {
    expect(
      resolvePageMeta({}, { ...ctx, seo: makeSeo({ defaultTitle: "Дефолт" }) }).title,
    ).toBe("Дефолт");
    expect(resolvePageMeta({}, { ...ctx, seo: makeSeo() }).title).toBe("ЖК Горизонт");
  });

  it("суффикс приклеивается через пробел", () => {
    const meta = resolvePageMeta(
      { title: "Новости" },
      { ...ctx, seo: makeSeo({ titleSuffix: "— ЖК Горизонт" }) },
    );
    expect(meta.title).toBe("Новости — ЖК Горизонт");
  });

  it("description: страница → дефолт → null", () => {
    const seo = makeSeo({ defaultDescription: "Дефолт" });
    expect(resolvePageMeta({ description: "Своё" }, { ...ctx, seo }).description).toBe("Своё");
    expect(resolvePageMeta({}, { ...ctx, seo }).description).toBe("Дефолт");
    expect(resolvePageMeta({}, { ...ctx, seo: makeSeo() }).description).toBeNull();
  });

  it("ogImage: страница → дефолт, всегда абсолютный", () => {
    const seo = makeSeo({ defaultOgImage: "/og.png" });
    expect(resolvePageMeta({ ogImage: "https://cdn.io/a.png" }, { ...ctx, seo }).ogImage).toBe(
      "https://cdn.io/a.png",
    );
    expect(resolvePageMeta({}, { ...ctx, seo }).ogImage).toBe("https://gorizont.ru/og.png");
  });

  it("robots: noindex когда сайт не индексируется, иначе null", () => {
    expect(
      resolvePageMeta({}, { ...ctx, seo: makeSeo({ indexable: false }) }).robots,
    ).toBe("noindex, nofollow");
    expect(resolvePageMeta({}, { ...ctx, seo: makeSeo() }).robots).toBeNull();
  });

  it("переживает отсутствие seo (gate не загрузился)", () => {
    const meta = resolvePageMeta({ title: "Т" }, { ...ctx, seo: null });
    expect(meta.title).toBe("Т");
    expect(meta.robots).toBeNull();
  });
});
