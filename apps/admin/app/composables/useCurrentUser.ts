import { useQuery } from "@tanstack/vue-query";

export type UserRole = "admin" | "editor";

export interface EditorPermissions {
  siteIds?: string[];
  sections?: string[];
  actions?: Array<"view" | "edit" | "publish">;
}

export function useCurrentUser() {
  const { $orpc } = useNuxtApp();
  const { data: me, isLoading } = useQuery($orpc.users.me.queryOptions());

  const impersonateCookie = useCookie<string | null>("zhk-impersonate-user", {
    default: () => null,
    sameSite: "lax",
  });

  const { data: allUsers } = useQuery({
    ...$orpc.users.list.queryOptions(),
    enabled: computed(() => !!me.value && me.value.role === "admin"),
  });

  const impersonated = computed(() => {
    const id = impersonateCookie.value;
    if (!id || !allUsers.value) return null;
    if (me.value?.role !== "admin") return null;
    return allUsers.value.find((u) => u.id === id) ?? null;
  });

  const effective = computed(() => impersonated.value ?? me.value);
  const isImpersonating = computed(() => !!impersonated.value);

  function startImpersonation(userId: string) {
    impersonateCookie.value = userId;
    if (typeof window !== "undefined") window.location.reload();
  }

  function stopImpersonation() {
    impersonateCookie.value = null;
    if (typeof window !== "undefined") window.location.reload();
  }

  const data = effective;
  const role = computed<UserRole>(() => (effective.value?.role as UserRole) ?? "editor");
  const isAdmin = computed(() => role.value === "admin");
  const permissions = computed<EditorPermissions>(
    () => (effective.value?.permissions as EditorPermissions) ?? {},
  );

  function canAccessSection(section: string) {
    if (isAdmin.value) return true;
    const allowed = permissions.value.sections;
    if (!allowed || allowed.length === 0) return false;
    return allowed.includes(section);
  }

  function canAccessSite(siteId: string) {
    if (isAdmin.value) return true;
    const allowed = permissions.value.siteIds;
    if (!allowed || allowed.length === 0) return true;
    return allowed.includes(siteId);
  }

  function can(action: "view" | "edit" | "publish") {
    if (isAdmin.value) return true;
    const allowed = permissions.value.actions;
    if (!allowed || allowed.length === 0) return action === "view";
    return allowed.includes(action);
  }

  return {
    user: data,
    me,
    isLoading,
    role,
    isAdmin,
    permissions,
    canAccessSection,
    canAccessSite,
    can,
    isImpersonating,
    impersonated,
    startImpersonation,
    stopImpersonation,
  };
}
