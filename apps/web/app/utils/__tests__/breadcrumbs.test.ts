import { describe, expect, it } from "vitest";
import { resolveBreadcrumbs } from "../breadcrumbs";

const HOME = { label: "Главная", href: "/" };

describe("resolveBreadcrumbs", () => {
  it("auto без parent → [Главная, current]", () => {
    expect(
      resolveBreadcrumbs({ auto: { current: "О нас" } }),
    ).toEqual([HOME, { label: "О нас" }]);
  });

  it("auto с parent → [Главная, parent, current]", () => {
    expect(
      resolveBreadcrumbs({
        auto: { current: "Статья", parent: { label: "Новости", href: "/news" } },
      }),
    ).toEqual([HOME, { label: "Новости", href: "/news" }, { label: "Статья" }]);
  });

  it("custom с items → [Главная, ...items]", () => {
    expect(
      resolveBreadcrumbs({
        config: { mode: "custom", items: [{ label: "Каталог", href: "/c" }, { label: "Товар" }] },
        auto: { current: "Игнор" },
      }),
    ).toEqual([HOME, { label: "Каталог", href: "/c" }, { label: "Товар" }]);
  });

  it("custom с пустым items → деградация в auto", () => {
    expect(
      resolveBreadcrumbs({ config: { mode: "custom", items: [] }, auto: { current: "О нас" } }),
    ).toEqual([HOME, { label: "О нас" }]);
  });

  it("mode hidden → null", () => {
    expect(
      resolveBreadcrumbs({ config: { mode: "hidden", items: [] }, auto: { current: "X" } }),
    ).toBeNull();
  });

  it("settings.enabled false → null", () => {
    expect(
      resolveBreadcrumbs({ auto: { current: "X" }, settings: { enabled: false } }),
    ).toBeNull();
  });

  it("isHome без showOnHome → null", () => {
    expect(resolveBreadcrumbs({ auto: { current: "X" }, isHome: true })).toBeNull();
  });

  it("isHome с showOnHome → рендерим", () => {
    expect(
      resolveBreadcrumbs({ auto: { current: "Главная" }, isHome: true, settings: { showOnHome: true } }),
    ).toEqual([HOME, { label: "Главная" }]);
  });

  it("кастомный homeLabel", () => {
    expect(
      resolveBreadcrumbs({ auto: { current: "О нас" }, settings: { homeLabel: "Home" } }),
    ).toEqual([{ label: "Home", href: "/" }, { label: "О нас" }]);
  });
});
