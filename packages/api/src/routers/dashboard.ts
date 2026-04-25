import { db } from "@zhk/db";
import {
  apartments,
  constructionProgress,
  modals,
  news,
  pages,
  projects,
  promotions,
  tickets,
} from "@zhk/db/schema";
import { desc, eq, gte, sql } from "drizzle-orm";
import { protectedProcedure } from "../index";

const TICKET_TYPES = ["lead", "callback", "question", "booking"] as const;
type TicketType = (typeof TICKET_TYPES)[number];
type TicketCounts = Record<TicketType, number> & { total: number };

function emptyTicketCounts(): TicketCounts {
  return { lead: 0, callback: 0, question: 0, booking: 0, total: 0 };
}

export const dashboardRouter = {
  overview: protectedProcedure.handler(async () => {
    const now = Date.now();
    const d24h = new Date(now - 24 * 60 * 60 * 1000);
    const d7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      aptByStatus,
      ticketsRecent,
      integration,
      lastLog,
      topProjects,
      newsDrafts,
      promoDrafts,
      pagesDrafts,
      modalDrafts,
      constructionDrafts,
    ] = await Promise.all([
      db
        .select({ status: apartments.status, value: sql<number>`count(*)::int` })
        .from(apartments)
        .groupBy(apartments.status),
      db
        .select({
          type: tickets.type,
          createdAt: tickets.createdAt,
        })
        .from(tickets)
        .where(gte(tickets.createdAt, d7d)),
      db.query.integrations.findFirst(),
      db.query.syncLogs.findFirst({
        orderBy: (l, { desc }) => [desc(l.startedAt)],
      }),
      db
        .select({
          id: projects.id,
          name: projects.name,
          total: projects.totalApartmentsCount,
          sold: projects.soldApartmentsCount,
          free: projects.freeApartmentsCount,
          paidReservation: projects.paidReservationCount,
          corporateReservation: projects.corporateReservationCount,
        })
        .from(projects)
        .orderBy(desc(projects.soldApartmentsCount))
        .limit(5),
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(news)
        .where(eq(news.status, "draft")),
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(promotions)
        .where(eq(promotions.status, "draft")),
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(pages)
        .where(eq(pages.status, "draft")),
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(modals)
        .where(eq(modals.status, "draft")),
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(constructionProgress)
        .where(eq(constructionProgress.status, "draft")),
    ]);

    const aptCounts = {
      free: 0,
      paidReservation: 0,
      corporateReservation: 0,
      sold: 0,
      total: 0,
    };
    for (const row of aptByStatus) {
      aptCounts.total += row.value;
      if (row.status === "free") aptCounts.free = row.value;
      else if (row.status === "paid_reservation")
        aptCounts.paidReservation = row.value;
      else if (row.status === "corporate_reservation")
        aptCounts.corporateReservation = row.value;
      else if (row.status === "sold") aptCounts.sold = row.value;
    }

    const ticketCounts = {
      last24h: emptyTicketCounts(),
      last7d: emptyTicketCounts(),
    };
    for (const t of ticketsRecent) {
      const type = t.type as TicketType;
      ticketCounts.last7d[type] += 1;
      ticketCounts.last7d.total += 1;
      if (t.createdAt >= d24h) {
        ticketCounts.last24h[type] += 1;
        ticketCounts.last24h.total += 1;
      }
    }

    return {
      apartments: aptCounts,
      tickets: ticketCounts,
      topProjects: topProjects.map((p) => ({
        ...p,
        soldPct:
          p.total && p.total > 0
            ? Math.round(((p.sold ?? 0) / p.total) * 100)
            : 0,
      })),
      sync: {
        integration: integration
          ? {
              id: integration.id,
              type: integration.type,
              status: integration.status,
              isActive: integration.isActive,
              autoSyncEnabled: integration.autoSyncEnabled,
              lastSyncAt: integration.lastSyncAt,
              nextSyncAt: integration.nextSyncAt,
              lastSyncDurationMs: integration.lastSyncDurationMs,
            }
          : null,
        lastLog: lastLog
          ? {
              id: lastLog.id,
              status: lastLog.status,
              trigger: lastLog.trigger,
              startedAt: lastLog.startedAt,
              finishedAt: lastLog.finishedAt,
              durationMs: lastLog.durationMs,
              stats: lastLog.stats,
              error: lastLog.error,
            }
          : null,
      },
      drafts: {
        news: newsDrafts[0]?.value ?? 0,
        promotions: promoDrafts[0]?.value ?? 0,
        pages: pagesDrafts[0]?.value ?? 0,
        modals: modalDrafts[0]?.value ?? 0,
        constructionProgress: constructionDrafts[0]?.value ?? 0,
      },
    };
  }),
};
