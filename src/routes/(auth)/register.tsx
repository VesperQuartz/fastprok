import { createFileRoute, Link } from "@tanstack/react-router";
import { authServerFn } from "@/actions/auth";
import { AuthLayout } from "@/components/auth/layout";
import { SignUp } from "@/components/auth/sign-up";

const RouteComponent = () => {
  const { session } = Route.useRouteContext();

  return (
    <AuthLayout>
      <Link to="/" className="mb-5 flex flex-col items-center text-center">
        <img src="/procurement-mark.png" alt="" className="mb-3 size-11 object-contain" />
        <span className="font-semibold text-lg">Procurement Agent</span>
        <span className="mt-0.5 text-muted-foreground text-sm">Set up your workspace.</span>
      </Link>
      <SignUp
        signedIn={Boolean(session)}
        signedInName={session?.user.name ?? ""}
        signedInEmail={session?.user.email ?? ""}
      />
    </AuthLayout>
  );
};

export const Route = createFileRoute("/(auth)/register")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await authServerFn();

    return { session };
  },
});
