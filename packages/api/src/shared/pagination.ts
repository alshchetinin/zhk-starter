import { z } from "zod";

export const paginationInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export function calcOffset(page: number, pageSize: number) {
  return (page - 1) * pageSize;
}
