import { createAuthClient } from "better-auth/vue";
import { adminClient } from "better-auth/client/plugins";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const authClient = createAuthClient({
    baseURL: config.public.serverUrl,
    plugins: [adminClient()],
  });

  return { provide: { authClient } };
});
