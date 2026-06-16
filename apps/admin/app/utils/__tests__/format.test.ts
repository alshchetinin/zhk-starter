import { describe, it, expect } from "vitest";
import { formatFileSize } from "../format";

describe("formatFileSize", () => {
  it("returns dash for empty / zero", () => {
    expect(formatFileSize(0)).toBe("—");
    expect(formatFileSize(null)).toBe("—");
    expect(formatFileSize(undefined)).toBe("—");
  });
  it("formats bytes", () => {
    expect(formatFileSize(512)).toBe("512 B");
  });
  it("formats kilobytes", () => {
    expect(formatFileSize(2048)).toBe("2.0 KB");
  });
  it("formats megabytes", () => {
    expect(formatFileSize(1_572_864)).toBe("1.5 MB");
  });
});
