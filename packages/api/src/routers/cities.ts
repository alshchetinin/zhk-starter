import { db } from "@zhk/db";
import { protectedProcedure } from "../index";

export const citiesRouter = {
  list: protectedProcedure.handler(async () => {
    return db.query.cities.findMany({
      orderBy: (c, { asc }) => [asc(c.name)],
    });
  }),
};
