import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authServerFn } from "@/actions/auth";
import { AppShell } from "@/components/procurement/app-shell";

export const Route = createFileRoute("/(dashboard)")({
  component: DashboardLayout,
  beforeLoad: async ({ location }) => {
    const session = await authServerFn();

    if (!session && location.pathname !== "/") {
      const returnTo = typeof window === "undefined" ? undefined : window.location.href;

      throw redirect({
        to: "/login",
        search: returnTo ? { redirect: returnTo } : {},
      });
    }

    return { session };
  },
});

function DashboardLayout() {
  const { session } = Route.useRouteContext();

  if (!session) {
    return <Outlet />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
