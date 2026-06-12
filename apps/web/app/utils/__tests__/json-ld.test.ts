import { describe, expect, it } from "vitest";
import {
  buildApartmentComplexJsonLd,
  buildBreadcrumbJsonLd,
  buildNewsArticleJsonLd,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  parseCoordinates,
} from "../json-ld";

describe("buildOrganizationJsonLd", () => {
  it("полные данные → полный объект", () => {
    const result = buildOrganizationJsonLd({
      name: "ЖК Горизонт",
      url: "https://gorizont.ru",
      legalName: "ООО Горизонт",
      logo: "https://cdn.io/logo.png",
      phone: "+7 900 000-00-00",
      email: "info@gorizont.ru",
      address: "г. Москва, ул. Ленина, 1",
      sameAs: ["https://vk.com/gorizont"],
    });
    expect(result).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "ЖК Горизонт",
      legalName: "ООО Горизонт",
      telephone: "+7 900 000-00-00",
      address: { "@type": "PostalAddress", streetAddress: "г. Москва, ул. Ленина, 1" },
      sameAs: ["https://vk.com/gorizont"],
    });
  });

  it("пустые поля опускаются", () => {
    const result = buildOrganizationJsonLd({ name: "ЖК", url: "https://x.ru" });
    expect(result).not.toBeNull();
    expect(Object.keys(result!)).not.toContain("legalName");
    expect(Object.keys(result!)).not.toContain("telephone");
    expect(Object.keys(result!)).not.toContain("address");
    expect(Object.keys(result!)).not.toContain("sameAs");
  });

  it("без имени — null", () => {
    expect(buildOrganizationJsonLd({ name: "", url: "https://x.ru" })).toBeNull();
  });
});

describe("buildWebSiteJsonLd", () => {
  it("name + url", () => {
    expect(buildWebSiteJsonLd({ name: "ЖК", url: "https://x.ru" })).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "ЖК",
      url: "https://x.ru",
    });
  });
});

describe("buildNewsArticleJsonLd", () => {
  it("собирает статью с publisher", () => {
    const result = buildNewsArticleJsonLd({
      headline: "Старт продаж",
      url: "https://x.ru/news/start",
      description: "Описание",
      image: "https://cdn.io/og.png",
      datePublished: "2026-06-01T00:00:00.000Z",
      dateModified: "2026-06-02T00:00:00.000Z",
      publisherName: "ЖК Горизонт",
      publisherLogo: "https://cdn.io/logo.png",
    });
    expect(result).toMatchObject({
      "@type": "NewsArticle",
      headline: "Старт продаж",
      image: ["https://cdn.io/og.png"],
      publisher: { "@type": "Organization", name: "ЖК Горизонт" },
    });
  });

  it("без publisherName нет publisher", () => {
    const result = buildNewsArticleJsonLd({ headline: "Т", url: "https://x.ru/news/t" });
    expect(Object.keys(result!)).not.toContain("publisher");
  });
});

describe("parseCoordinates", () => {
  it("парсит 'lat,lng'", () => {
    expect(parseCoordinates("55.75, 37.61")).toEqual({ latitude: 55.75, longitude: 37.61 });
  });
  it("мусор и пустота — null", () => {
    expect(parseCoordinates("abc")).toBeNull();
    expect(parseCoordinates(null)).toBeNull();
    expect(parseCoordinates("55.75")).toBeNull();
  });
});

describe("buildApartmentComplexJsonLd", () => {
  it("собирает ЖК с geo и адресом", () => {
    const result = buildApartmentComplexJsonLd({
      name: "ЖК Горизонт",
      url: "https://x.ru/projects/1",
      address: "ул. Ленина, 1",
      coordinates: "55.75,37.61",
      images: ["https://cdn.io/1.png", null, "https://cdn.io/2.png"],
    });
    expect(result).toMatchObject({
      "@type": "ApartmentComplex",
      geo: { "@type": "GeoCoordinates", latitude: 55.75, longitude: 37.61 },
      image: ["https://cdn.io/1.png", "https://cdn.io/2.png"],
    });
  });

  it("без координат и картинок поля опускаются", () => {
    const result = buildApartmentComplexJsonLd({ name: "ЖК", url: "https://x.ru/p/1" });
    expect(Object.keys(result!)).not.toContain("geo");
    expect(Object.keys(result!)).not.toContain("image");
  });
});

describe("buildBreadcrumbJsonLd", () => {
  it("позиции с 1, имя и url", () => {
    const result = buildBreadcrumbJsonLd([
      { name: "Главная", url: "https://x.ru/" },
      { name: "Новости", url: "https://x.ru/news" },
    ]);
    expect(result!.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Главная", item: "https://x.ru/" },
      { "@type": "ListItem", position: 2, name: "Новости", item: "https://x.ru/news" },
    ]);
  });
  it("пустой список — null", () => {
    expect(buildBreadcrumbJsonLd([])).toBeNull();
  });
});
