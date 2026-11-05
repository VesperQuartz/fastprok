import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authServerFn } from "@/actions/auth";

export const Route = createFileRoute("/(dashboard)")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await authServerFn();
    if (!session) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location?.href,
        },
      });
    }
  },
});

function RouteComponent() {
  return <Outlet />;
}
