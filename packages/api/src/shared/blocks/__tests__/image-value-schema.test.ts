import { describe, it, expect } from "vitest";
import { imageValue, imagesValue } from "../_core";

describe("imageValue", () => {
  it("принимает строку-url", () => {
    expect(imageValue.parse("https://s3/x.jpg")).toBe("https://s3/x.jpg");
  });
  it("принимает объект {url, alt}", () => {
    expect(imageValue.parse({ url: "https://s3/x.jpg", alt: "Фасад" })).toEqual({
      url: "https://s3/x.jpg",
      alt: "Фасад",
    });
  });
  it("alt опционален", () => {
    expect(imageValue.parse({ url: "https://s3/x.jpg" })).toEqual({ url: "https://s3/x.jpg" });
  });
});

describe("imagesValue", () => {
  it("массив строк и объектов вперемешку", () => {
    const v = ["https://s3/a.jpg", { url: "https://s3/b.jpg", alt: "b" }];
    expect(imagesValue.parse(v)).toEqual(v);
  });
});
