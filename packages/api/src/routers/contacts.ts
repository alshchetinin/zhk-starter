import { z } from "zod";
import { db } from "@zhk/db";
import { contacts } from "@zhk/db/schema";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "../index";

const socialSchema = z.object({
  link: z.string().min(1),
  type: z.enum(["vk", "telegram", "whatsapp", "ok", "youtube", "dzen"]),
});

const officeSchema = z.object({
  title: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  workingHours: z.string().optional(),
  coordinates: z.string().optional(),
  image: z.string().optional(),
});

const saveInput = z.object({
  phone: z.string().min(1),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  address: z.string().min(1),
  workingHours: z.string().optional(),
  coordinates: z.string().optional(),
  mapLink: z.union([z.string().url(), z.literal("")]).optional(),
  location: z.string().optional(),
  socials: z.array(socialSchema).default([]),
  offices: z.array(officeSchema).default([]),
});

export const contactsRouter = {
  get: protectedProcedure.handler(async () => {
    const record = await db.query.contacts.findFirst();
    return record ?? null;
  }),

  save: protectedProcedure.input(saveInput).handler(async ({ input }) => {
    const data = {
      phone: input.phone,
      email: input.email || null,
      address: input.address,
      workingHours: input.workingHours || null,
      coordinates: input.coordinates || null,
      mapLink: input.mapLink || null,
      location: input.location || null,
      socials: input.socials,
      offices: input.offices,
    };

    const existing = await db.query.contacts.findFirst();

    if (existing) {
      const [updated] = await db
        .update(contacts)
        .set(data)
        .where(eq(contacts.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(contacts)
      .values(data)
      .returning();
    return created;
  }),
};
