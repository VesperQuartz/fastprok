import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Store01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { Link, useNavigate, createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { authServerFn } from "@/actions/auth";
import { AuthLayout } from "@/components/auth/layout";
import { SignIn } from "@/components/auth/sign-in";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";

const DEMO_ACCOUNTS = [
  {
    id: "buyer",
    label: "Requester",
    email: "lilbrown3000+buyer@gmail.com",
    hint: "Creates requests and reviews quotes",
    icon: UserIcon,
  },
  {
    id: "approver",
    label: "Approver",
    email: "lilbrown3000+approver@gmail.com",
    hint: "Makes the final decision",
    icon: CheckmarkCircle02Icon,
  },
  {
    id: "vendor-d",
    label: "Vendor",
    email: "lilbrown3000+vendor-d@gmail.com",
    hint: "Submits and edits quotes",
    icon: Store01Icon,
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
      <Link to="/" className="mb-5 flex flex-col items-center text-center">
        <img src="/procurement-mark.png" alt="" className="mb-3 size-11 object-contain" />
        <span className="font-semibold text-lg">fastprok</span>
        <span className="mt-0.5 text-muted-foreground text-sm">
          Request, quote, and approve in one workspace.
        </span>
      </Link>

      <div className="rounded-xl border border-border/70 bg-card p-4">
        <div>
          <p className="font-medium text-sm">Try the demo</p>
          <p className="mt-0.5 text-muted-foreground text-xs">Pick a role. No sign-up needed.</p>
        </div>
        <div className="mt-3 grid gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.id}
              variant="outline"
              className="h-auto justify-start gap-3 bg-background px-3 py-2.5 text-left"
              onClick={() => void demoSignIn(account)}
              disabled={signingIn !== null}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <HugeiconsIcon icon={account.icon} strokeWidth={1.8} className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-sm">{account.label}</span>
                <span className="block truncate text-muted-foreground text-xs">{account.hint}</span>
              </span>
              {signingIn === account.id ? (
                <span className="text-muted-foreground text-xs">Signing in…</span>
              ) : (
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  strokeWidth={2}
                  className="size-4 text-muted-foreground"
                />
              )}
            </Button>
          ))}
        </div>
      </div>

      <div className="my-4 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">or sign in with email</span>
        <Separator className="flex-1" />
      </div>

      <SignIn redirectTo={redirectTo} />
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
