import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, PackageIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { StatCard } from "@/components/procurement/stat-card";
import { StatusBadge } from "@/components/procurement/status-badge";
import { formatDate, formatDateTime, formatMoney, timeLeft } from "@/components/procurement/format";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { orpc } from "@/lib/orpc/client";

type RequestRow = {
  id: string;
  title: string;
  status: string;
  quantity: number;
  unit: string;
  deliveryRegion: string;
  neededBy: string;
  deadlineAt: string;
  budgetCents: number | null;
  currency: string;
  createdAt: string;
};

type VendorRow = {
  requestId: string;
  title: string;
  status: string;
  quantity: number;
  unit: string;
  deliveryRegion: string;
  neededBy: string;
  deadlineAt: string;
  invitationStatus: string;
  quoteStatus: string | null;
  quoteTotalCents: number | null;
};

const Summary = ({ requests }: { requests: RequestRow[] }) => {
  const open = requests.filter(
    (request) => request.status === "quoting" || request.status === "awaiting_approval",
  ).length;
  const awaiting = requests.filter((request) => request.status === "awaiting_approval").length;
  const approved = requests.filter((request) => request.status === "approved").length;

  return (
    <section className="grid overflow-hidden rounded-xl border border-border/70 bg-card sm:grid-cols-[1.25fr_1fr_1fr]">
      <StatCard featured label="Open requests" value={open} hint="In progress" />
      <StatCard
        label="Awaiting approval"
        value={awaiting}
        hint="Ready to review"
        className="border-t border-border/70 sm:border-t-0 sm:border-l"
      />
      <StatCard
        label="Approved"
        value={approved}
        hint="Closed"
        className="border-t border-border/70 sm:border-t-0 sm:border-l"
      />
    </section>
  );
};

const RequestTable = ({ requests }: { requests: RequestRow[] }) => (
  <div className="hidden overflow-hidden rounded-xl border border-border/70 bg-card md:block">
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead className="h-10 px-4 text-muted-foreground">Request</TableHead>
          <TableHead className="h-10 px-4 text-muted-foreground">Status</TableHead>
          <TableHead className="h-10 px-4 text-muted-foreground">Needed by</TableHead>
          <TableHead className="h-10 px-4 text-muted-foreground">Quote deadline</TableHead>
          <TableHead className="h-10 px-4 text-right text-muted-foreground">Budget</TableHead>
          <TableHead className="h-10 w-10 px-4" aria-label="Open request" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.id} className="relative has-[a:focus-visible]:bg-muted/40">
            <TableCell className="whitespace-normal px-4 py-3">
              <Link
                to="/requests/$requestId"
                params={{ requestId: request.id }}
                className="font-medium text-foreground after:absolute after:inset-0 focus-visible:underline focus-visible:outline-none"
              >
                {request.title}
              </Link>
              <p className="mt-0.5 text-muted-foreground text-xs">
                {request.quantity} {request.unit}, {request.deliveryRegion}
              </p>
            </TableCell>
            <TableCell className="px-4 py-3">
              <StatusBadge status={request.status} />
            </TableCell>
            <TableCell className="px-4 py-3 text-muted-foreground">
              {formatDate(request.neededBy)}
            </TableCell>
            <TableCell className="px-4 py-3">
              {request.status === "quoting" ? (
                <>
                  <span className="font-medium text-sm">{timeLeft(request.deadlineAt)}</span>
                  <span className="mt-0.5 block text-muted-foreground text-xs">
                    {formatDateTime(request.deadlineAt)}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Closed</span>
              )}
            </TableCell>
            <TableCell className="px-4 py-3 text-right tabular-nums">
              {request.budgetCents === null ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                formatMoney(request.budgetCents, request.currency)
              )}
            </TableCell>
            <TableCell className="px-4 py-3">
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                strokeWidth={2}
                className="size-4 text-muted-foreground"
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const RequestCards = ({ requests }: { requests: RequestRow[] }) => (
  <div className="space-y-2 md:hidden">
    {requests.map((request) => (
      <Link
        key={request.id}
        to="/requests/$requestId"
        params={{ requestId: request.id }}
        className="block rounded-xl border border-border/70 bg-card p-4 transition-colors hover:bg-muted/40"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{request.title}</p>
            <p className="mt-0.5 text-muted-foreground text-xs">
              {request.quantity} {request.unit}, {request.deliveryRegion}
            </p>
          </div>
          <StatusBadge status={request.status} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span
            className={
              request.status === "quoting" ? "font-medium text-sm" : "text-muted-foreground text-sm"
            }
          >
            {request.status === "quoting" ? timeLeft(request.deadlineAt) : "Quotes closed"}
          </span>
          <span className="text-muted-foreground text-xs">
            Needed {formatDate(request.neededBy)}
          </span>
        </div>
      </Link>
    ))}
  </div>
);

const VendorTable = ({ items }: { items: VendorRow[] }) => (
  <div className="hidden overflow-hidden rounded-xl border border-border/70 bg-card md:block">
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead className="h-10 px-4 text-muted-foreground">Invitation</TableHead>
          <TableHead className="h-10 px-4 text-muted-foreground">Your quote</TableHead>
          <TableHead className="h-10 px-4 text-muted-foreground">Status</TableHead>
          <TableHead className="h-10 px-4 text-muted-foreground">Deadline</TableHead>
          <TableHead className="h-10 w-10 px-4" aria-label="Open invitation" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.requestId} className="relative has-[a:focus-visible]:bg-muted/40">
            <TableCell className="whitespace-normal px-4 py-3">
              <Link
                to="/vendor/requests/$requestId"
                params={{ requestId: item.requestId }}
                className="font-medium text-foreground after:absolute after:inset-0 focus-visible:underline focus-visible:outline-none"
              >
                {item.title}
              </Link>
              <p className="mt-0.5 text-muted-foreground text-xs">
                {item.quantity} {item.unit}, {item.deliveryRegion}
              </p>
            </TableCell>
            <TableCell className="px-4 py-3 tabular-nums">
              {item.quoteTotalCents === null ? (
                <span className="text-muted-foreground">Not quoted</span>
              ) : (
                formatMoney(item.quoteTotalCents)
              )}
            </TableCell>
            <TableCell className="px-4 py-3">
              <StatusBadge status={item.quoteStatus ?? item.invitationStatus} />
            </TableCell>
            <TableCell className="px-4 py-3">
              {item.status === "quoting" ? (
                <>
                  <span className="font-medium text-sm">{timeLeft(item.deadlineAt)}</span>
                  <span className="mt-0.5 block text-muted-foreground text-xs">
                    {formatDateTime(item.deadlineAt)}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Closed</span>
              )}
            </TableCell>
            <TableCell className="px-4 py-3">
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                strokeWidth={2}
                className="size-4 text-muted-foreground"
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const VendorCards = ({ items }: { items: VendorRow[] }) => (
  <div className="space-y-2 md:hidden">
    {items.map((item) => (
      <Link
        key={item.requestId}
        to="/vendor/requests/$requestId"
        params={{ requestId: item.requestId }}
        className="block rounded-xl border border-border/70 bg-card p-4 transition-colors hover:bg-muted/40"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{item.title}</p>
            <p className="mt-0.5 text-muted-foreground text-xs">
              {item.quantity} {item.unit}, {item.deliveryRegion}
            </p>
          </div>
          <StatusBadge status={item.quoteStatus ?? item.invitationStatus} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-sm">
            {item.quoteTotalCents === null ? (
              <span className="text-muted-foreground">Not quoted</span>
            ) : (
              <span className="font-medium tabular-nums">{formatMoney(item.quoteTotalCents)}</span>
            )}
          </span>
          <span className="text-muted-foreground text-xs">
            {item.status === "quoting" ? timeLeft(item.deadlineAt) : "Quotes closed"}
          </span>
        </div>
      </Link>
    ))}
  </div>
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
      <Empty className="border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={PackageIcon} strokeWidth={1.8} />
          </EmptyMedia>
          <EmptyTitle>No requests yet</EmptyTitle>
          <EmptyDescription>
            Describe what you need and the agent will find vendors, collect quotes, and rank them.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link to="/requests/new" />}>
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
            Create a request
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-5">
      <Summary requests={requests} />
      <RequestTable requests={requests} />
      <RequestCards requests={requests} />
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
      <Empty className="border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={PackageIcon} strokeWidth={1.8} />
          </EmptyMedia>
          <EmptyTitle>No invitations yet</EmptyTitle>
          <EmptyDescription>
            When a buyer invites you to quote, the request will appear here and in your email.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-5">
      <VendorTable items={items} />
      <VendorCards items={items} />
    </div>
  );
};

const Home = () => {
  const me = useQuery(orpc.me.queryOptions());
  const isVendor = me.data?.kind === "vendor";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-semibold text-2xl tracking-tight text-balance sm:text-3xl">
            {isVendor ? "Quote invitations" : "Procurement requests"}
          </h1>
          <p className="mt-1 max-w-2xl text-muted-foreground text-sm text-pretty">
            {isVendor
              ? "Submit your price before the deadline. The agent handles the rest."
              : "Describe a need. The agent finds vendors, chases quotes, and ranks them."}
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
