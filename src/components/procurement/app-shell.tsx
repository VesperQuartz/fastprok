import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  Logout01Icon,
  PlusSignIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc/client";

const navLinkClass =
  "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

export const AppShell = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useQuery(orpc.me.queryOptions());
  const actor = me.data;

  const signOut = async () => {
    await authClient.signOut();
    queryClient.clear();
    await navigate({ to: "/login" });
  };

  return (
    <div className="min-h-svh bg-[#f6f7f9]">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
              <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold text-[15px] leading-tight">
                Procurement Agent
              </span>
              <span className="block truncate text-[11px] text-muted-foreground leading-tight">
                {actor?.organization?.name ?? actor?.vendor?.name ?? "Workspace"}
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              to="/"
              className={navLinkClass}
              activeProps={{ className: "bg-muted text-foreground" }}
            >
              <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} className="size-4" />
              {actor?.kind === "vendor" ? "Invitations" : "Requests"}
            </Link>
            {actor?.kind === "buyer" ? (
              <Link
                to="/requests/new"
                className={navLinkClass}
                activeProps={{ className: "bg-muted text-foreground" }}
              >
                <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-4" />
                New request
              </Link>
            ) : null}
          </nav>

          <div className="flex items-center gap-2">
            {actor ? (
              <Badge variant="secondary" className="hidden rounded-full font-normal md:inline-flex">
                {actor.kind === "vendor" ? "Vendor" : actor.canApprove ? "Approver" : "Requester"}
              </Badge>
            ) : (
              <Skeleton className="h-5 w-16 rounded-full" />
            )}
            <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sign out">
              <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:py-9">{children}</main>
    </div>
  );
};
