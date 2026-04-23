import { useQuery } from "@tanstack/vue-query";
import { IMPERSONATE_COOKIE, PERMISSION_ACTIONS } from "@zhk/api/shared/constants";
import type { PermissionAction } from "@zhk/api/shared/constants";

export type UserRole = "admin" | "editor";

export interface EditorPermissions {
  siteIds?: string[];
  sections?: string[];
  actions?: PermissionAction[];
}

export { PERMISSION_ACTIONS };
export type { PermissionAction };

export function useCurrentUser() {
  const { $orpc } = useNuxtApp();
  const { data: me, isLoading } = useQuery($orpc.users.me.queryOptions());

  const impersonateCookie = useCookie<string | null>(IMPERSONATE_COOKIE, {
    default: () => null,
    sameSite: "lax",
  });

  const impersonateId = computed(() =>
    me.value?.role === "admin" ? impersonateCookie.value : null,
  );

  const { data: impersonated } = useQuery(
    computed(() => ({
      ...$orpc.users.getById.queryOptions({ input: { id: impersonateId.value ?? "" } }),
      enabled: !!impersonateId.value,
    })),
  );

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

  function can(action: PermissionAction) {
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
