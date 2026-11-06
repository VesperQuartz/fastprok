import { HugeiconsIcon } from "@hugeicons/react";
import { DashboardSquare01Icon, Logout01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc/client";
import { NotificationBell } from "./notification-bell";

export const AppShell = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const me = useQuery(orpc.me.queryOptions());
  const actor = me.data;

  const isVendor = actor?.kind === "vendor";
  const workspaceName = actor?.organization?.name ?? actor?.vendor?.name ?? "Workspace";
  const roleLabel = isVendor ? "Vendor" : actor?.canApprove ? "Approver" : "Requester";
  const requestsActive =
    pathname === "/" ||
    pathname.startsWith("/requests/") ||
    pathname.startsWith("/vendor/requests/");
  const newRequestActive = pathname === "/requests/new";

  const signOut = async () => {
    await authClient.signOut();
    queryClient.clear();
    await navigate({ to: "/login" });
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip="fastprok" render={<Link to="/" />}>
                <img
                  src="/procurement-mark.png"
                  alt=""
                  className="size-8 shrink-0 object-contain"
                />
                <span className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold text-[15px]">fastprok</span>
                  <span className="truncate text-muted-foreground text-xs">{workspaceName}</span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={requestsActive}
                    tooltip={isVendor ? "Invitations" : "Requests"}
                    className="h-11 md:h-9"
                    render={<Link to="/" />}
                  >
                    <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} />
                    <span>{isVendor ? "Invitations" : "Requests"}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {actor?.kind === "buyer" ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={newRequestActive}
                      tooltip="New request"
                      className="h-11 md:h-9"
                      render={<Link to="/requests/new" />}
                    >
                      <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
                      <span>New request</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              {actor ? (
                <div className="flex items-center gap-2 rounded-md p-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-xs">
                    {roleLabel.slice(0, 1)}
                  </span>
                  <span className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-medium text-sm">{actor.user.name}</span>
                    <span className="truncate text-muted-foreground text-xs">
                      {actor.user.email}
                    </span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              )}
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Sign out"
                className="h-11 md:h-9"
                onClick={() => void signOut()}
              >
                <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-[#f6f7f9]">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border/80 bg-[#f6f7f9]/90 px-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="size-11 md:size-7" />
            <div className="min-w-0 md:hidden">
              <p className="truncate font-medium text-sm">fastprok</p>
              <p className="truncate text-muted-foreground text-[11px]">{workspaceName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <NotificationBell />
            {actor ? (
              <Badge variant="secondary" className="rounded-full font-normal">
                {roleLabel}
              </Badge>
            ) : (
              <Skeleton className="h-5 w-16 rounded-full" />
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:py-9">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
};
