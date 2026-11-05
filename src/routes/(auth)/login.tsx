import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { AuthLayout } from "@/components/auth/layout";
import { SignIn } from "@/components/auth/sign-in";
import { authServerFn } from "@/actions/auth";

const RouteComponent = () => {
  const { redirect: redirectTo } = Route.useSearch();

  return (
    <AuthLayout>
      <SignIn redirectTo={redirectTo} />
    </AuthLayout>
  );
};

export const Route = createFileRoute("/(auth)/login")({
  component: RouteComponent,
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  beforeLoad: async () => {
    const session = await authServerFn();
    if (session) {
      throw redirect({ to: "/" });
    }
  },
});
