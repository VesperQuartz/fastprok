import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authServerFn } from "@/actions/auth";
import { AppShell } from "@/components/procurement/app-shell";

export const Route = createFileRoute("/(dashboard)")({
  component: DashboardLayout,
  beforeLoad: async () => {
    const session = await authServerFn();

    if (!session) {
      const returnTo = typeof window === "undefined" ? undefined : window.location.href;

      throw redirect({
        to: "/login",
        search: returnTo ? { redirect: returnTo } : {},
      });
    }
  },
});

function DashboardLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
