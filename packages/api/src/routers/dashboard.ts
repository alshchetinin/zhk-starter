import { db } from "@zhk/db";
import {
  apartments,
  constructionProgress,
  modals,
  news,
  pages,
  projects,
  promotions,
  sites,
  tickets,
} from "@zhk/db/schema";
import { asc, desc, eq, gte, sql } from "drizzle-orm";
import { protectedProcedure } from "../index";

const TICKET_TYPES = ["lead", "callback", "question", "booking"] as const;
type TicketType = (typeof TICKET_TYPES)[number];
type TicketCounts = Record<TicketType, number> & { total: number };

function emptyTicketCounts(): TicketCounts {
  return { lead: 0, callback: 0, question: 0, booking: 0, total: 0 };
}

const DRAFT_STATUS = "draft" as const;

type DraftCounts = {
  news: number;
  promotions: number;
  pages: number;
  modals: number;
  constructionProgress: number;
};

function emptyDraftCounts(): DraftCounts {
  return {
    news: 0,
    promotions: 0,
    pages: 0,
    modals: 0,
    constructionProgress: 0,
  };
}

export const dashboardRouter = {
  overview: protectedProcedure.handler(async () => {
    const now = Date.now();
    const d24h = new Date(now - 24 * 60 * 60 * 1000);
    const d7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      siteRows,
      aptByStatus,
      ticketsRecent,
      integration,
      lastLog,
      topProjects,
      newsBySite,
      promoBySite,
      pagesBySite,
      modalsBySite,
      constructionBySite,
    ] = await Promise.all([
      db
        .select({
          id: sites.id,
          slug: sites.slug,
          name: sites.name,
          isPrimary: sites.isPrimary,
          isActive: sites.isActive,
        })
        .from(sites)
        .orderBy(desc(sites.isPrimary), asc(sites.name)),
      db
        .select({ status: apartments.status, value: sql<number>`count(*)::int` })
        .from(apartments)
        .groupBy(apartments.status),
      db
        .select({ type: tickets.type, createdAt: tickets.createdAt })
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
        .select({ siteId: news.siteId, value: sql<number>`count(*)::int` })
        .from(news)
        .where(eq(news.status, DRAFT_STATUS))
        .groupBy(news.siteId),
      db
        .select({ siteId: promotions.siteId, value: sql<number>`count(*)::int` })
        .from(promotions)
        .where(eq(promotions.status, DRAFT_STATUS))
        .groupBy(promotions.siteId),
      db
        .select({ siteId: pages.siteId, value: sql<number>`count(*)::int` })
        .from(pages)
        .where(eq(pages.status, DRAFT_STATUS))
        .groupBy(pages.siteId),
      db
        .select({ siteId: modals.siteId, value: sql<number>`count(*)::int` })
        .from(modals)
        .where(eq(modals.status, DRAFT_STATUS))
        .groupBy(modals.siteId),
      db
        .select({
          siteId: constructionProgress.siteId,
          value: sql<number>`count(*)::int`,
        })
        .from(constructionProgress)
        .where(eq(constructionProgress.status, DRAFT_STATUS))
        .groupBy(constructionProgress.siteId),
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

    const draftsBySite = new Map<string, DraftCounts>();
    function addDraft(rows: { siteId: string; value: number }[], key: keyof DraftCounts) {
      for (const r of rows) {
        const cur = draftsBySite.get(r.siteId) ?? emptyDraftCounts();
        cur[key] = r.value;
        draftsBySite.set(r.siteId, cur);
      }
    }
    addDraft(newsBySite, "news");
    addDraft(promoBySite, "promotions");
    addDraft(pagesBySite, "pages");
    addDraft(modalsBySite, "modals");
    addDraft(constructionBySite, "constructionProgress");

    const draftsBySiteArr = siteRows.map((s) => {
      const counts = draftsBySite.get(s.id) ?? emptyDraftCounts();
      const total =
        counts.news +
        counts.promotions +
        counts.pages +
        counts.modals +
        counts.constructionProgress;
      return {
        siteId: s.id,
        siteName: s.name,
        siteSlug: s.slug,
        isPrimary: s.isPrimary,
        isActive: s.isActive,
        total,
        ...counts,
      };
    });

    const draftsTotals = draftsBySiteArr.reduce<DraftCounts & { total: number }>(
      (acc, s) => {
        acc.news += s.news;
        acc.promotions += s.promotions;
        acc.pages += s.pages;
        acc.modals += s.modals;
        acc.constructionProgress += s.constructionProgress;
        acc.total += s.total;
        return acc;
      },
      { ...emptyDraftCounts(), total: 0 },
    );

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
        totals: draftsTotals,
        bySite: draftsBySiteArr,
      },
    };
  }),
};
