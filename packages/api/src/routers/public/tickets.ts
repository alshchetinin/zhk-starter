import { z } from "zod";
import { db } from "@zhk/db";
import { tickets, ticketTypeEnum, modals, formReceivers } from "@zhk/db/schema";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { captureUnexpected } from "@zhk/observability";
import { publicActiveSiteProcedure } from "../../index";
import { rateLimit } from "../../middleware/rate-limit";
import {
  ticketFieldsSchema,
  normalizeSubmission,
  deriveTicketColumns,
  validateSubmission,
  type FormFieldDef,
  type FlatSubmission,
  type TicketField,
} from "../../shared/ticket-fields";
import { resolveReceiverIds, createPendingDeliveries, processTicketDeliveries } from "../../services/receivers";

/** Извлекает slug модалки из source вида "modal:{slug}". */
function modalSlugFromSource(source: string | undefined): string | null {
  if (!source) return null;
  const m = /^modal:(.+)$/.exec(source);
  return m ? m[1]! : null;
}

/** Первый контакт (телефон, иначе почта) — для rate-limit дедупа. */
function contactKey(input: { fields?: TicketField[] } & FlatSubmission): string | undefined {
  const cols = deriveTicketColumns(normalizeSubmission(input));
  return cols.phone ?? cols.email ?? undefined;
}

export const publicTicketsRouter = {
  create: publicActiveSiteProcedure
    .use(rateLimit("ticketCreate", { keyBy: "ip+site" }))
    .use(rateLimit("ticketCreateHourly", { keyBy: "ip+site" }))
    .use(rateLimit("ticketCreate", {
      keyBy: "ip+extra",
      extractExtra: (input) => contactKey(input as { fields?: TicketField[] } & FlatSubmission),
    }))
    .input(
      z.object({
        // Новый структурный путь:
        fields: ticketFieldsSchema.optional(),
        // Legacy/программный путь (fallback):
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.union([z.string().email(), z.literal("")]).optional(),
        message: z.string().optional(),
        // Общее:
        type: z.enum(ticketTypeEnum.enumValues).default("lead"),
        source: z.string().optional(),
        url: z.string().optional(),
        utm: z.record(z.string(), z.string()).optional(),
        apartmentId: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const siteId = context.siteId;
      const fields = normalizeSubmission(input);

      // Резолв формы: нужны и receiverIds (для приёмщиков), и fields (для валидации).
      const slug = modalSlugFromSource(input.source);
      const form = slug
        ? await db.query.modals.findFirst({
            where: and(eq(modals.siteId, siteId), eq(modals.slug, slug)),
            columns: { receiverIds: true, fields: true },
          })
        : null;

      const formDef = (form?.fields as FormFieldDef[] | undefined) ?? null;
      const validation = validateSubmission(fields, formDef);
      if (!validation.ok) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Проверьте поля формы",
          data: { issues: validation.issues },
        });
      }

      const cols = deriveTicketColumns(fields);

      const created = await db
        .insert(tickets)
        .values({
          siteId,
          name: cols.name,
          phone: cols.phone,
          email: cols.email,
          message: cols.message,
          additionalInfo: { fields },
          type: input.type,
          source: input.source ?? null,
          url: input.url ?? null,
          utm: input.utm ?? null,
          apartmentId: input.apartmentId ?? null,
        })
        .returning()
        .then((r) => r[0]!);

      // Резолв приёмщиков (форма → receiverIds, иначе все enabled).
      const enabled = await db.query.formReceivers.findMany({
        where: and(eq(formReceivers.siteId, siteId), eq(formReceivers.enabled, true)),
        orderBy: (r, { asc }) => [asc(r.sortOrder), asc(r.createdAt)],
      });
      const targetIds = resolveReceiverIds(form ?? null, enabled);
      const targets = enabled.filter((r) => targetIds.includes(r.id));

      if (targets.length > 0) {
        const deliveryIds = await createPendingDeliveries(
          created.id,
          targets.map((r) => ({ id: r.id, type: r.type, name: r.name })),
        );
        void processTicketDeliveries(created.id, deliveryIds).catch((err) =>
          captureUnexpected(err, { operation: "tickets.deliver", siteId }),
        );
      }

      return { success: true, id: created.id };
    }),
};
