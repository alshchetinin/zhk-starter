import type { ProviderGetImage } from "@nuxt/image";
import { buildImgproxyUrl, type ImgproxyModifiers } from "./imgproxy-url";

export const getImage: ProviderGetImage = (src, { modifiers = {}, baseURL = "" } = {}) => {
  return { url: buildImgproxyUrl(src, modifiers as ImgproxyModifiers, baseURL) };
};
