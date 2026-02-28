export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === "/login") return;

  const { $authClient } = useNuxtApp();

  const { data } = await $authClient.getSession();

  if (!data) {
    return navigateTo("/login");
  }
});
