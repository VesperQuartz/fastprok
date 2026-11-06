import { HugeiconsIcon } from "@hugeicons/react";
import { BellIcon, BellOffIcon } from "@hugeicons/core-free-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { NotificationRow } from "@/components/procurement/notification-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { orpc } from "@/lib/orpc/client";

const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const list = useQuery(
    orpc.notifications.list.queryOptions({
      refetchInterval: 15_000,
    }),
  );
  const markAll = useMutation(
    orpc.notifications.markAllRead.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(),
    }),
  );

  const items = list.data?.items ?? [];
  const unread = list.data?.unreadCount ?? 0;
  const visible = filter === "unread" ? items.filter((item) => !item.readAt) : items;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <HugeiconsIcon icon={BellIcon} strokeWidth={1.8} className="size-4" />
            </span>
            <h1 className="font-semibold text-2xl tracking-tight">Notifications</h1>
            {unread > 0 ? (
              <Badge variant="secondary" className="rounded-full font-normal">
                {unread} unread
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-muted-foreground text-sm">
            Invitations, quotes, reminders, and approvals.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={unread === 0 || markAll.isPending}
          onClick={() => markAll.mutate()}
        >
          Mark all as read
        </Button>
      </div>

      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value === "unread" ? "unread" : "all")}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="border-border/70 shadow-none">
        <CardContent className="p-0">
          {list.isPending ? (
            <div className="space-y-4 p-5">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="flex gap-3">
                  <Skeleton className="size-8 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <HugeiconsIcon icon={BellOffIcon} strokeWidth={1.8} className="size-5" />
              </span>
              <p className="font-medium">
                {filter === "unread" ? "Nothing unread" : "No notifications yet"}
              </p>
              <p className="max-w-sm text-muted-foreground text-sm">
                {filter === "unread"
                  ? "You have read everything in your workspace."
                  : "When a vendor is invited, a quote arrives, or an approval happens, it shows up here."}
              </p>
            </div>
          ) : (
            <div>
              {visible.map((item) => (
                <NotificationRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute("/(dashboard)/notifications")({
  component: NotificationsPage,
});
