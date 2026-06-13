// Чистая логика построения URL imgproxy — без рантайма Nuxt, тестируется юнит-тестом.

// fit из @nuxt/image → resize type imgproxy
const FIT_MAP: Record<string, string> = {
  cover: "fill",
  contain: "fit",
  fill: "force",
  inside: "fit",
  outside: "fill",
};

export interface ImgproxyModifiers {
  width?: number | string;
  height?: number | string;
  fit?: string;
  quality?: number | string;
}

export function base64Url(input: string): string {
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(input, "utf-8").toString("base64")
      : btoa(unescape(encodeURIComponent(input)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function buildImgproxyUrl(
  src: string,
  modifiers: ImgproxyModifiers = {},
  baseURL = "",
): string {
  const { width, height, fit = "cover", quality } = modifiers;
  const segments: string[] = [];

  if (width || height) {
    const resizeType = FIT_MAP[fit] ?? "fill";
    segments.push(`rs:${resizeType}:${Number(width) || 0}:${Number(height) || 0}`);
  }
  if (quality) {
    segments.push(`q:${Number(quality)}`);
  }

  const processing = segments.join("/");
  const encoded = base64Url(src);
  const tail = processing ? `unsafe/${processing}/${encoded}` : `unsafe/${encoded}`;
  return `${baseURL.replace(/\/$/, "")}/${tail}`;
}
