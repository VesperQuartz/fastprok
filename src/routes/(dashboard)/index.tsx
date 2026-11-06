import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  PackageIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { StatusBadge } from "@/components/procurement/status-badge";
import { formatDate, formatMoney, timeLeft } from "@/components/procurement/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc/client";

const Stat = ({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: typeof PackageIcon;
}) => (
  <Card className="border-border/70 shadow-none">
    <CardContent className="flex items-start justify-between gap-3 p-4">
      <div>
        <p className="text-muted-foreground text-xs uppercase tracking-wide">{label}</p>
        <p className="mt-1 font-semibold text-2xl tabular-nums">{value}</p>
        <p className="mt-0.5 text-muted-foreground text-xs">{hint}</p>
      </div>
      <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <HugeiconsIcon icon={icon} strokeWidth={1.8} className="size-4" />
      </span>
    </CardContent>
  </Card>
);

const RequestList = () => {
  const me = useQuery(orpc.me.queryOptions());
  const list = useQuery({
    ...orpc.requests.list.queryOptions(),
    enabled: me.data?.kind === "buyer",
  });

  if (me.isPending || list.isPending) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-[74px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const requests = list.data ?? [];

  if (requests.length === 0) {
    return (
      <Card className="border-dashed border-border/80 shadow-none">
        <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <HugeiconsIcon icon={PackageIcon} strokeWidth={1.8} className="size-5" />
          </span>
          <div>
            <p className="font-medium">No requests yet</p>
            <p className="mt-1 text-muted-foreground text-sm">
              Describe what you need and the agent will find vendors.
            </p>
          </div>
          <Button render={<Link to="/requests/new" />}>
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
            Create a request
          </Button>
        </CardContent>
      </Card>
    );
  }

  const active = requests.filter(
    (request) => request.status === "quoting" || request.status === "awaiting_approval",
  ).length;
  const awaiting = requests.filter((request) => request.status === "awaiting_approval").length;
  const approved = requests.filter((request) => request.status === "approved").length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Active" value={active} hint="being sourced right now" icon={PackageIcon} />
        <Stat
          label="Awaiting approval"
          value={awaiting}
          hint="agent has ranked quotes"
          icon={Clock01Icon}
        />
        <Stat
          label="Approved"
          value={approved}
          hint="decisions closed"
          icon={CheckmarkCircle02Icon}
        />
      </div>

      <div className="space-y-2">
        {requests.map((request) => (
          <Link
            key={request.id}
            to="/requests/$requestId"
            params={{ requestId: request.id }}
            className="group block"
          >
            <Card className="border-border/70 shadow-none transition-shadow group-hover:shadow-sm">
              <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-2 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{request.title}</p>
                    <StatusBadge status={request.status} />
                  </div>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {request.quantity} {request.unit} · {request.deliveryRegion} · needed{" "}
                    {formatDate(request.neededBy)}
                    {request.budgetCents !== null
                      ? ` · budget ${formatMoney(request.budgetCents, request.currency)}`
                      : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-xs">
                    {request.status === "quoting" ? timeLeft(request.deadlineAt) : "quotes closed"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(request.createdAt.slice(0, 10))}
                  </p>
                </div>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  strokeWidth={2}
                  className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

const VendorInbox = () => {
  const me = useQuery(orpc.me.queryOptions());
  const inbox = useQuery({
    ...orpc.vendor.inbox.queryOptions(),
    enabled: me.data?.kind === "vendor",
  });

  if (me.isPending || inbox.isPending) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-[74px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const items = inbox.data ?? [];

  if (items.length === 0) {
    return (
      <Card className="border-dashed border-border/80 shadow-none">
        <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <HugeiconsIcon icon={PackageIcon} strokeWidth={1.8} className="size-5" />
          </span>
          <div>
            <p className="font-medium">No invitations yet</p>
            <p className="mt-1 text-muted-foreground text-sm">
              New quote requests will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.requestId}
          to="/vendor/requests/$requestId"
          params={{ requestId: item.requestId }}
          className="group block"
        >
          <Card className="border-border/70 shadow-none transition-shadow group-hover:shadow-sm">
            <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-2 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{item.title}</p>
                  <StatusBadge status={item.quoteStatus ?? item.invitationStatus} />
                  <StatusBadge status={item.status} className="text-[11px]" />
                </div>
                <p className="mt-1 text-muted-foreground text-sm">
                  {item.quantity} {item.unit} · {item.deliveryRegion} · needed{" "}
                  {formatDate(item.neededBy)}
                  {item.quoteTotalCents !== null
                    ? ` · your quote ${formatMoney(item.quoteTotalCents)}`
                    : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-xs">
                  {item.status === "quoting" ? timeLeft(item.deadlineAt) : "quotes closed"}
                </p>
              </div>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                strokeWidth={2}
                className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

const Home = () => {
  const me = useQuery(orpc.me.queryOptions());
  const isVendor = me.data?.kind === "vendor";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-medium text-blue-600 text-xs uppercase tracking-[0.14em]">
            {isVendor ? "Vendor workspace" : "Agent workspace"}
          </p>
          <h1 className="mt-1 font-semibold text-2xl tracking-tight sm:text-3xl">
            {isVendor ? "Quote invitations" : "Procurement requests"}
          </h1>
          <p className="mt-1 max-w-xl text-muted-foreground text-sm">
            {isVendor
              ? "Answer requests inside the app before the deadline. The agent handles the chasing."
              : "Describe a need in plain language. The agent structures it, finds vendors, and ranks every quote."}
          </p>
        </div>
        {!isVendor && me.data ? (
          <Button render={<Link to="/requests/new" />}>
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
            New request
          </Button>
        ) : null}
      </div>

      {isVendor ? <VendorInbox /> : <RequestList />}
    </div>
  );
};

export const Route = createFileRoute("/(dashboard)/")({
  component: Home,
});
