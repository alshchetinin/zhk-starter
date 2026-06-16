import { describe, expect, it } from "vitest";
import type { SiteNavigation } from "@zhk/db/schema";
import {
  siteNavigationSchema,
  defaultSiteNavigation,
  remapNavigationReferences,
  collectNavReferences,
  resolveNavigation,
  type NavResolveContext,
} from "../navigation";

const nav: SiteNavigation = {
  header: [
    { id: "a", label: "О нас", target: { kind: "page", pageId: "p1" } },
    { id: "c", target: { kind: "category", categoryId: "cat1" } },
    { id: "d", label: "VK", target: { kind: "url", href: "https://vk.com", external: true } },
    { id: "e", label: "Звонок", target: { kind: "action", modal: "zakazat-zvonok" } },
  ],
  footer: [
    { id: "col1", title: "Меню", items: [{ id: "f1", target: { kind: "page", pageId: "p1" } }] },
  ],
};

describe("siteNavigationSchema", () => {
  it("парсит валидную навигацию", () => {
    expect(siteNavigationSchema.parse(nav)).toEqual(nav);
  });

  it("парсит дефолтную навигацию (consistency)", () => {
    expect(() => siteNavigationSchema.parse(defaultSiteNavigation)).not.toThrow();
  });

  it("отклоняет неизвестный kind", () => {
    expect(() =>
      siteNavigationSchema.parse({ header: [{ id: "x", target: { kind: "foo" } }], footer: [] }),
    ).toThrow();
  });
});

describe("collectNavReferences", () => {
  it("собирает уникальные pageId и categoryId из хедера и футера, включая children", () => {
    const withChild: SiteNavigation = {
      header: [
        { id: "a", target: { kind: "page", pageId: "p1" }, children: [
          { id: "a1", target: { kind: "page", pageId: "p2" } },
        ] },
      ],
      footer: [{ id: "col", items: [{ id: "f", target: { kind: "category", categoryId: "cat1" } }] }],
    };
    const refs = collectNavReferences(withChild);
    expect(new Set(refs.pageIds)).toEqual(new Set(["p1", "p2"]));
    expect(refs.categoryIds).toEqual(["cat1"]);
  });
});

describe("remapNavigationReferences", () => {
  const pageMap = new Map([["p1", "P1"]]);
  const catMap = new Map([["cat1", "CAT1"]]);

  it("ремапит page и category, не трогает url/action", () => {
    const out = remapNavigationReferences(nav, pageMap, catMap)!;
    expect(out.header[0]!.target).toEqual({ kind: "page", pageId: "P1" });
    expect(out.header[1]!.target).toEqual({ kind: "category", categoryId: "CAT1" });
    expect(out.header[2]!.target).toEqual({ kind: "url", href: "https://vk.com", external: true });
    expect(out.header[3]!.target).toEqual({ kind: "action", modal: "zakazat-zvonok" });
    expect(out.footer[0]!.items[0]!.target).toEqual({ kind: "page", pageId: "P1" });
  });

  it("рекурсивно ремапит children", () => {
    const withChild: SiteNavigation = {
      header: [{ id: "a", target: { kind: "url", href: "/" }, children: [
        { id: "a1", target: { kind: "page", pageId: "p1" } },
      ] }],
      footer: [],
    };
    const out = remapNavigationReferences(withChild, pageMap, catMap)!;
    expect(out.header[0]!.children![0]!.target).toEqual({ kind: "page", pageId: "P1" });
  });

  it("неизвестный id остаётся как есть; undefined → undefined", () => {
    expect(remapNavigationReferences(undefined, pageMap, catMap)).toBeUndefined();
    const out = remapNavigationReferences(
      { header: [{ id: "a", target: { kind: "page", pageId: "unknown" } }], footer: [] },
      pageMap, catMap,
    )!;
    expect(out.header[0]!.target).toEqual({ kind: "page", pageId: "unknown" });
  });
});

describe("resolveNavigation", () => {
  const ctx: NavResolveContext = {
    pages: new Map([["p1", { slug: "about", title: "О компании" }]]),
    categories: new Map([["cat1", { title: "Правила" }]]),
    pagesByCategory: new Map([["cat1", [
      { slug: "rules-1", title: "Правило 1" },
      { slug: "rules-2", title: "Правило 2" },
    ]]]),
  };

  it("page → href + фолбэк label на title", () => {
    const out = resolveNavigation(
      { header: [{ id: "a", target: { kind: "page", pageId: "p1" } }], footer: [] }, ctx,
    );
    expect(out.header[0]).toMatchObject({ id: "a", label: "О компании", href: "/pages/about" });
  });

  it("явный label переопределяет title", () => {
    const out = resolveNavigation(
      { header: [{ id: "a", label: "О нас", target: { kind: "page", pageId: "p1" } }], footer: [] }, ctx,
    );
    expect(out.header[0]!.label).toBe("О нас");
  });

  it("отсутствующая/неопубликованная страница отфильтровывается", () => {
    const out = resolveNavigation(
      { header: [{ id: "a", target: { kind: "page", pageId: "missing" } }], footer: [] }, ctx,
    );
    expect(out.header).toHaveLength(0);
  });

  it("category → подпункты-страницы без href у родителя", () => {
    const out = resolveNavigation(
      { header: [{ id: "c", target: { kind: "category", categoryId: "cat1" } }], footer: [] }, ctx,
    );
    expect(out.header[0]!.label).toBe("Правила");
    expect(out.header[0]!.href).toBeUndefined();
    expect(out.header[0]!.children).toEqual([
      { id: "c:rules-1", label: "Правило 1", href: "/pages/rules-1" },
      { id: "c:rules-2", label: "Правило 2", href: "/pages/rules-2" },
    ]);
  });

  it("url → href + external; action → action-маркер", () => {
    const out = resolveNavigation(
      { header: [
        { id: "u", label: "VK", target: { kind: "url", href: "https://vk.com", external: true } },
        { id: "m", label: "Звонок", target: { kind: "action", modal: "zakazat-zvonok" } },
      ], footer: [] }, ctx,
    );
    expect(out.header[0]).toMatchObject({ href: "https://vk.com", external: true });
    expect(out.header[1]).toMatchObject({ action: "zakazat-zvonok", label: "Звонок" });
  });

  it("резолвит футер-колонки", () => {
    const out = resolveNavigation(nav, ctx);
    expect(out.footer[0]!.title).toBe("Меню");
    expect(out.footer[0]!.items[0]).toMatchObject({ href: "/pages/about" });
  });

  it("отсутствующая категория отфильтровывается", () => {
    const out = resolveNavigation(
      { header: [{ id: "c", target: { kind: "category", categoryId: "missing" } }], footer: [] }, ctx,
    );
    expect(out.header).toHaveLength(0);
  });

  it("category: явные подпункты идут перед авто-страницами категории", () => {
    const out = resolveNavigation(
      { header: [{ id: "c", target: { kind: "category", categoryId: "cat1" }, children: [
        { id: "manual", label: "Вручную", target: { kind: "url", href: "https://x.test" } },
      ] }], footer: [] }, ctx,
    );
    expect(out.header[0]!.children!.map((c) => c.id)).toEqual(["manual", "c:rules-1", "c:rules-2"]);
  });

  it("url без external → external отсутствует", () => {
    const out = resolveNavigation(
      { header: [{ id: "u", label: "X", target: { kind: "url", href: "https://x.test" } }], footer: [] }, ctx,
    );
    expect(out.header[0]).toMatchObject({ href: "https://x.test" });
    expect(out.header[0]!.external).toBeUndefined();
  });
});
