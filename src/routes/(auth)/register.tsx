import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/layout";
import { SignUp } from "@/components/auth/sign-up";
import { authServerFn } from "@/actions/auth";

const RouteComponent = () => (
  <AuthLayout>
    <SignUp />
  </AuthLayout>
);

export const Route = createFileRoute("/(auth)/register")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await authServerFn();
    if (session) {
      throw redirect({ to: "/" });
    }
  },
});
