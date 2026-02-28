import { createEnv } from "@t3-oss/env-nuxt";
import { z } from "zod";

export const env = createEnv({
  client: {
    NUXT_PUBLIC_SERVER_URL: z.string().url(),
  },
  emptyStringAsUndefined: true,
});
