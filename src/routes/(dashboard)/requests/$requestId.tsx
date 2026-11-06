import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  RefreshIcon,
  Robot01Icon,
  Settings01Icon,
  SparklesIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  actionLabel,
  categoryLabel,
  describeAction,
  formatDate,
  formatDateTime,
  formatMoney,
  priorityLabel,
  timeLeft,
} from "@/components/procurement/format";
import { StatusBadge } from "@/components/procurement/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc/client";

const FLAG_LABELS: Record<string, string> = {
  partial_quantity: "Partial quantity",
  late_delivery: "Late delivery",
  over_budget: "Over budget",
  late_submission: "Late submission",
};

const Meta = ({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) => (
  <div>
    <dt className="text-muted-foreground text-xs">{label}</dt>
    <dd className="mt-1 font-medium text-sm">{value}</dd>
    {secondary ? <dd className="mt-0.5 text-muted-foreground text-xs">{secondary}</dd> : null}
  </div>
);

const Timeline = ({ requestId }: { requestId: string }) => {
  const timeline = useQuery(orpc.requests.timeline.queryOptions({ input: { requestId } }));

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <HugeiconsIcon icon={Robot01Icon} strokeWidth={2} className="size-4 text-blue-600" />
          Agent timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {timeline.isPending ? (
          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <ol>
            {(timeline.data ?? []).map((item, index, items) => {
              const actor =
                item.actorType === "agent"
                  ? { label: "Agent", icon: Robot01Icon, className: "bg-blue-50 text-blue-700" }
                  : item.actorType === "human"
                    ? {
                        label:
                          item.action === "quote.submitted" || item.action === "quote.updated"
                            ? "Vendor"
                            : "Buyer",
                        icon: UserIcon,
                        className: "bg-emerald-50 text-emerald-700",
                      }
                    : {
                        label: "System",
                        icon: Settings01Icon,
                        className: "bg-muted text-muted-foreground",
                      };

              return (
                <li key={item.id} className="flex gap-3 pb-4 last:pb-0">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full ${actor.className}`}
                    >
                      <HugeiconsIcon icon={actor.icon} strokeWidth={1.8} className="size-3.5" />
                    </span>
                    {index < items.length - 1 ? (
                      <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
                    ) : null}
                  </div>
                  <div className="min-w-0 pb-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <p className="font-medium text-[13px]">{actionLabel(item.action)}</p>
                      <p className="text-muted-foreground text-[11px]">
                        {actor.label}, {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                    {describeAction(item.action, item.detail) ? (
                      <p className="mt-0.5 text-muted-foreground text-xs">
                        {describeAction(item.action, item.detail)}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
};

const RequestDetailPage = () => {
  const { requestId } = Route.useParams();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const me = useQuery(orpc.me.queryOptions());
  const detail = useQuery(orpc.requests.get.queryOptions({ input: { requestId } }));
  const quotes = useQuery(orpc.requests.quoteList.queryOptions({ input: { requestId } }));

  const tick = useMutation(
    orpc.agent.tick.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries();
        toast.success(
          `Agent check complete: ${result.summary.remindersSent} reminders, ${result.summary.requestsRanked} ranked.`,
        );
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const approve = useMutation(
    orpc.requests.approve.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries();
        toast.success(`Approved ${result.vendorName}. Vendors have been notified.`);
        setNote("");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (detail.isPending || me.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!detail.data) {
    return (
      <Card className="border-border/70 shadow-none">
        <CardContent className="p-8 text-center">
          <p className="font-medium">This request could not be loaded.</p>
          <p className="mt-1 text-muted-foreground text-sm">
            It may have been removed, or you may not have access to it.
          </p>
          <Button variant="outline" className="mt-4" render={<Link to="/" />}>
            Back to requests
          </Button>
        </CardContent>
      </Card>
    );
  }

  const request = detail.data.request;
  const recommendation = request.recommendation;
  const canApprove = me.data?.canApprove === true && request.status === "awaiting_approval";
  const quoteRows = quotes.data ?? [];
  const winner = recommendation?.winner ?? null;
  const approvedQuote = quoteRows.find((quote) => quote.status === "won") ?? null;

  return (
    <div className="space-y-5">
      <div>
        <Button variant="ghost" size="sm" render={<Link to="/" />} className="-ml-2 mb-2">
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          Back to requests
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-semibold text-2xl tracking-tight text-balance">
                {request.title}
              </h1>
              <StatusBadge status={request.status} />
            </div>
            <p className="mt-1 max-w-2xl text-muted-foreground text-sm text-pretty">
              {request.rawText}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => tick.mutate({ requestId })}
              disabled={tick.isPending}
            >
              <HugeiconsIcon
                icon={RefreshIcon}
                strokeWidth={2}
                className={tick.isPending ? "animate-spin" : ""}
              />
              {tick.isPending ? "Checking…" : "Run agent check"}
            </Button>
            {request.status === "quoting" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => tick.mutate({ requestId, forceRank: true })}
                disabled={tick.isPending}
              >
                <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
                Rank now
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Card className="border-border/70 shadow-none">
        <CardContent className="p-5">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <Meta label="Quantity" value={`${request.quantity} ${request.unit}`} />
            <Meta label="Deliver to" value={request.deliveryRegion} />
            <Meta label="Needed by" value={formatDate(request.neededBy)} />
            <Meta
              label="Budget"
              value={
                request.budgetCents === null
                  ? "Not stated"
                  : formatMoney(request.budgetCents, request.currency)
              }
            />
            <Meta
              label="Quote deadline"
              value={formatDateTime(request.deadlineAt)}
              secondary={
                request.status === "quoting" ? timeLeft(request.deadlineAt) : "Quotes closed"
              }
            />
            <Meta label="Priority" value={priorityLabel(request.priority)} />
            <Meta label="Category" value={categoryLabel(request.category)} />
            <Meta
              label="Invited"
              value={`${detail.data.invitations.length} vendor${
                detail.data.invitations.length === 1 ? "" : "s"
              }`}
            />
          </dl>
        </CardContent>
      </Card>

      {recommendation ? (
        <Card className="border-blue-200 shadow-none">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-muted-foreground text-sm">Agent recommendation</p>
                <p className="mt-1 font-semibold text-xl text-balance">
                  {winner ? winner.vendorName : "No quote met every requirement"}
                </p>
                {winner ? (
                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                    <Meta label="Total" value={formatMoney(winner.totalPriceCents)} />
                    <Meta label="Delivery" value={formatDate(winner.deliveryDate)} />
                    <Meta
                      label="Warranty"
                      value={
                        winner.warrantyMonths === 0
                          ? "None"
                          : `${winner.warrantyMonths} month${winner.warrantyMonths === 1 ? "" : "s"}`
                      }
                    />
                  </dl>
                ) : null}
              </div>
              {winner ? (
                <div className="text-right">
                  <p className="font-semibold text-3xl tabular-nums">
                    {(winner.scoreBps / 100).toFixed(1)}
                  </p>
                  <p className="text-muted-foreground text-xs">score</p>
                </div>
              ) : null}
            </div>

            <p className="mt-4 text-foreground/80 text-sm leading-relaxed text-pretty">
              {recommendation.reason}
            </p>
            <p className="mt-2 text-muted-foreground text-xs">
              {recommendation.quoteCount} quote{recommendation.quoteCount === 1 ? "" : "s"} scored.{" "}
              {winner ? `${winner.vendorName} recommended.` : "No quote met every requirement."}
            </p>

            {approvedQuote ? (
              <p className="mt-3 text-sm">
                <span className="text-muted-foreground">Approved quote:</span>{" "}
                <span className="font-medium">{approvedQuote.vendorName}</span>
              </p>
            ) : null}

            {canApprove ? (
              <div className="mt-4 border-t pt-4">
                <Label htmlFor="approval-note" className="font-medium text-sm">
                  Approval note (optional)
                </Label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="approval-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Why this quote?"
                    className="bg-background sm:max-w-md"
                  />
                  {winner ? (
                    <Button
                      onClick={() =>
                        approve.mutate({
                          requestId,
                          quoteId: winner.quoteId,
                          note: note.trim() || null,
                        })
                      }
                      disabled={approve.isPending}
                    >
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
                      Approve {winner.vendorName}
                    </Button>
                  ) : null}
                  {recommendation.ranked.some((quote) => quote.quoteId !== winner?.quoteId) ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="outline"
                            className="h-11 sm:h-8"
                            disabled={approve.isPending}
                          />
                        }
                      >
                        Approve another quote
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-56">
                        {recommendation.ranked
                          .filter((quote) => quote.quoteId !== winner?.quoteId)
                          .map((quote) => (
                            <DropdownMenuItem
                              key={quote.quoteId}
                              disabled={approve.isPending}
                              onClick={() =>
                                approve.mutate({
                                  requestId,
                                  quoteId: quote.quoteId,
                                  note: note.trim() || null,
                                })
                              }
                            >
                              <div className="grid gap-0.5">
                                <span className="font-medium">{quote.vendorName}</span>
                                <span className="text-muted-foreground text-xs">
                                  {formatMoney(quote.totalPriceCents)}, delivers{" "}
                                  {formatDate(quote.deliveryDate)}
                                </span>
                              </div>
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
                <p className="mt-1.5 text-muted-foreground text-xs">
                  The note is recorded in the timeline. The agent never approves on its own.
                </p>
              </div>
            ) : request.status === "awaiting_approval" ? (
              <p className="mt-4 border-t pt-4 text-muted-foreground text-sm">
                An organization approver makes the final call. You can still review every quote.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="border-border/70 shadow-none">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">
                {recommendation ? "Ranked quotes" : "Quotes received"}
              </CardTitle>
              <Badge variant="secondary" className="rounded-full font-normal">
                {recommendation?.ranked.length ?? quoteRows.length}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendation ? (
                recommendation.ranked.map((quote) => {
                  const isWinner = winner?.quoteId === quote.quoteId;

                  return (
                    <div
                      key={quote.quoteId}
                      className={`rounded-xl border p-4 ${
                        isWinner ? "border-blue-200 bg-blue-50/30" : "border-border/70"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            className={`flex size-8 shrink-0 items-center justify-center rounded-full font-semibold text-sm ${
                              isWinner ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {quote.rank}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{quote.vendorName}</p>
                              {isWinner ? (
                                <Badge variant="secondary" className="rounded-full font-normal">
                                  Recommended
                                </Badge>
                              ) : null}
                              {quote.tier > 1 ? (
                                <Badge variant="outline" className="rounded-full text-[11px]">
                                  Below requirements
                                </Badge>
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-muted-foreground text-xs">
                              {quote.quantityOffered} units offered
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-xl tabular-nums">
                            {(quote.scoreBps / 100).toFixed(1)}
                          </p>
                          <p className="text-muted-foreground text-xs">score</p>
                        </div>
                      </div>

                      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Meta label="Total" value={formatMoney(quote.totalPriceCents)} />
                        <Meta label="Delivery" value={formatDate(quote.deliveryDate)} />
                        <Meta
                          label="Warranty"
                          value={
                            quote.warrantyMonths === 0
                              ? "None"
                              : `${quote.warrantyMonths} month${quote.warrantyMonths === 1 ? "" : "s"}`
                          }
                        />
                        <Meta
                          label="Quantity"
                          value={`${quote.quantityOffered} of ${request.quantity}`}
                        />
                      </dl>

                      {quote.flags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {quote.flags.map((flag) => (
                            <Badge
                              key={flag}
                              variant="outline"
                              className="rounded-full border-amber-200 bg-amber-50 text-[11px] text-amber-800"
                            >
                              {FLAG_LABELS[flag] ?? flag}
                            </Badge>
                          ))}
                        </div>
                      ) : null}

                      {!isWinner && quote.aiReason ? (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-muted-foreground text-xs hover:text-foreground">
                            Why this rank
                          </summary>
                          <p className="mt-2 text-foreground/75 text-sm leading-relaxed text-pretty">
                            {quote.aiReason}
                          </p>
                        </details>
                      ) : null}
                    </div>
                  );
                })
              ) : quoteRows.length > 0 ? (
                quoteRows.map((quote) => (
                  <div key={quote.id} className="rounded-xl border border-border/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{quote.vendorName}</p>
                        <p className="mt-0.5 text-muted-foreground text-xs">
                          Version {quote.version}, updated {formatDateTime(quote.updatedAt)}
                        </p>
                      </div>
                      <StatusBadge status={quote.status} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Meta label="Total" value={formatMoney(quote.totalPriceCents)} />
                      <Meta label="Delivery" value={formatDate(quote.deliveryDate)} />
                      <Meta
                        label="Warranty"
                        value={
                          quote.warrantyMonths === 0
                            ? "None"
                            : `${quote.warrantyMonths} month${quote.warrantyMonths === 1 ? "" : "s"}`
                        }
                      />
                      <Meta
                        label="Quantity"
                        value={`${quote.quantityOffered} of ${request.quantity}`}
                      />
                    </dl>
                  </div>
                ))
              ) : (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyTitle>Waiting for the first quote</EmptyTitle>
                    <EmptyDescription>
                      Invited vendors get an email and a notification. The agent chases anyone who
                      goes quiet.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>

          <Timeline requestId={requestId} />
        </div>

        <div className="space-y-4">
          <Card className="border-border/70 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Invited vendors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {detail.data.invitations.map((invite) => (
                <div
                  key={invite.vendorId}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">{invite.vendorName}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {invite.reminderCount > 0
                        ? `${invite.reminderCount} reminder${
                            invite.reminderCount === 1 ? "" : "s"
                          } sent`
                        : `Invited ${formatDateTime(invite.invitedAt)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={invite.status} />
                    {invite.quoteTotalCents !== null ? (
                      <p className="mt-1 text-muted-foreground text-[11px] tabular-nums">
                        {formatMoney(invite.quoteTotalCents)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
              <Separator className="my-1" />
              <p className="text-muted-foreground text-xs">
                Vendors only see their own quote. Your budget is never shown to them.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/(dashboard)/requests/$requestId")({
  component: RequestDetailPage,
});
