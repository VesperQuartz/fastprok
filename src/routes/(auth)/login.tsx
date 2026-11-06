import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { useNavigate, createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { authServerFn } from "@/actions/auth";
import { AuthLayout } from "@/components/auth/layout";
import { SignIn } from "@/components/auth/sign-in";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

const DEMO_ACCOUNTS = [
  {
    id: "buyer",
    label: "Requester",
    email: "lilbrown3000+buyer@gmail.com",
    hint: "creates requests, reviews quotes",
  },
  {
    id: "approver",
    label: "Approver",
    email: "lilbrown3000+approver@gmail.com",
    hint: "can approve a quote",
  },
  {
    id: "vendor-d",
    label: "Vendor",
    email: "lilbrown3000+vendor-d@gmail.com",
    hint: "submits and edits quotes",
  },
];

const LoginPage = () => {
  const { redirect: redirectTo } = Route.useSearch();
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = useState<string | null>(null);

  const demoSignIn = async (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setSigningIn(account.id);
    const { error } = await authClient.signIn.email({
      email: account.email,
      password: "demo1234",
    });

    if (error) {
      setSigningIn(null);
      toast.error(error.message ?? "Could not sign in to the demo account.");
      return;
    }

    await navigate({ to: redirectTo ?? "/" });
  };

  return (
    <AuthLayout>
      <div className="mb-5 flex flex-col items-center text-center">
        <span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
          <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-5" />
        </span>
        <p className="font-semibold text-lg">Procurement Agent</p>
        <p className="mt-0.5 text-muted-foreground text-sm">
          Request, quote, and approve in one workspace.
        </p>
      </div>

      <SignIn redirectTo={redirectTo} />

      <div className="mt-4 rounded-xl border border-border/70 bg-muted/40 p-3">
        <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
          Demo accounts
        </p>
        <div className="mt-2 grid gap-1.5">
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.id}
              variant="outline"
              size="sm"
              className="h-auto justify-start bg-white px-2.5 py-1.5"
              onClick={() => void demoSignIn(account)}
              disabled={signingIn !== null}
            >
              <span className="font-medium">{account.label}</span>
              <span className="ml-auto text-[11px] text-muted-foreground">
                {signingIn === account.id ? "signing in…" : account.hint}
              </span>
            </Button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
};

export const Route = createFileRoute("/(auth)/login")({
  component: LoginPage,
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
