import { describe, it, expect } from "vitest";
import { buildBlockFieldIndex, remapBlockReferences } from "../site-duplication";
import type { ContentBlock } from "@zhk/db/schema";

describe("buildBlockFieldIndex", () => {
  it("маппит тип блока → {имя поля → тип поля}", () => {
    const idx = buildBlockFieldIndex();
    expect(idx.get("contacts")?.get("contactIds")).toBe("contacts");
  });
});

describe("remapBlockReferences", () => {
  const idx = buildBlockFieldIndex();
  const contactsMap = new Map([["c1", "C1"], ["c2", "C2"]]);

  it("ремапит contacts-поля (массив id) на новые", () => {
    const blocks: ContentBlock[] = [
      { id: "b1", type: "contacts", data: { title: "Контакты", contactIds: ["c1", "c2"], showMap: true } },
    ];
    const out = remapBlockReferences(blocks, contactsMap, idx);
    expect(out[0]!.data.contactIds).toEqual(["C1", "C2"]);
    expect(out[0]!.data.title).toBe("Контакты");
  });

  it("оставляет project-поля (projectId) как есть", () => {
    const blocks: ContentBlock[] = [
      { id: "b2", type: "project-gallery", data: { projectId: "p1" } },
    ];
    const out = remapBlockReferences(blocks, contactsMap, idx);
    expect(out[0]!.data.projectId).toBe("p1");
  });

  it("неизвестный contactId оставляет как есть; null/undefined блоки → []", () => {
    const blocks: ContentBlock[] = [
      { id: "b3", type: "contacts", data: { contactIds: ["c1", "unknown"], showMap: false } },
    ];
    const out = remapBlockReferences(blocks, contactsMap, idx);
    expect(out[0]!.data.contactIds).toEqual(["C1", "unknown"]);
    expect(remapBlockReferences(null, contactsMap, idx)).toEqual([]);
  });
});
