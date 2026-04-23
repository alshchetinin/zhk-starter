import { z } from "zod";
import { defineBlock } from "./_core";

export const heroFullscreenBlock = defineBlock({
  type: "hero-fullscreen",
  label: "Hero на весь экран",
  icon: "i-tabler-photo",
  description: "Полноэкранный hero-блок со слайдером, адресом и сроками сдачи",
  dataSchema: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    images: z.array(z.string().url()),
    address: z.string().min(1),
    district: z.string().optional(),
    walkTime: z.string().optional(),
    driveTime: z.string().optional(),
    buildings: z.array(z.object({
      label: z.string().min(1),
      date: z.string().min(1),
    })).min(1).max(6),
    primaryButtonLabel: z.string().optional(),
    primaryButtonUrl: z.union([z.string().url(), z.literal("")]).optional(),
    secondaryButtonLabel: z.string().optional(),
    secondaryButtonUrl: z.union([z.string().url(), z.literal("")]).optional(),
  }),
  defaultData: {
    title: "",
    description: undefined,
    images: [],
    address: "",
    district: undefined,
    walkTime: undefined,
    driveTime: undefined,
    buildings: [],
    primaryButtonLabel: undefined,
    primaryButtonUrl: undefined,
    secondaryButtonLabel: undefined,
    secondaryButtonUrl: undefined,
  },
});
