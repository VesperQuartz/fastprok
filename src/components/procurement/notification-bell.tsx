import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, BellIcon, BellOffIcon } from "@hugeicons/core-free-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc/client";
import { NotificationRow } from "./notification-row";

export const NotificationBell = () => {
  const queryClient = useQueryClient();
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

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative size-11 md:size-8"
            aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
          />
        }
      >
        <HugeiconsIcon icon={BellIcon} strokeWidth={2} className="size-[18px]" />
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 font-semibold text-[10px] text-white tabular-nums"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,380px)] gap-0 p-0">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <p className="font-semibold text-sm">Notifications</p>
            <p className="text-muted-foreground text-xs">
              {unread > 0 ? `${unread} unread` : "You're all caught up"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            disabled={unread === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all read
          </Button>
        </div>

        {list.isPending ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="size-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <HugeiconsIcon icon={BellOffIcon} strokeWidth={1.8} className="size-5" />
            </span>
            <p className="font-medium text-sm">No notifications yet</p>
            <p className="text-muted-foreground text-xs">
              Invitations, quotes, and approvals will show up here.
            </p>
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto">
            {items.slice(0, 8).map((item) => (
              <NotificationRow key={item.id} item={item} />
            ))}
          </div>
        )}

        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full justify-between"
            nativeButton={false}
            render={<Link to="/notifications" />}
          >
            View all notifications
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
