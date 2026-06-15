import { describe, expect, it } from "vitest";
import { escapeHtml } from "../escape";

describe("escapeHtml", () => {
  it("экранирует &, < и >", () => {
    expect(escapeHtml("a & b < c > d")).toBe("a &amp; b &lt; c &gt; d");
  });

  it("обезвреживает тег <script>", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });

  it("оставляет обычный текст без изменений", () => {
    expect(escapeHtml("Иван Петров +7 999")).toBe("Иван Петров +7 999");
  });
});
