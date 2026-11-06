import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  MoneyBag02Icon,
  RefreshIcon,
  Robot01Icon,
  SparklesIcon,
  Store01Icon,
} from "@hugeicons/core-free-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  actionLabel,
  describeAction,
  formatDate,
  formatDateTime,
  formatMoney,
  timeLeft,
} from "@/components/procurement/format";
import { StatusBadge } from "@/components/procurement/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc/client";

const FLAG_LABELS: Record<string, string> = {
  partial_quantity: "Partial quantity",
  late_delivery: "Late delivery",
  over_budget: "Over budget",
  late_submission: "Late submission",
};

const MetaItem = ({
  icon,
  label,
  value,
}: {
  icon: typeof Calendar03Icon;
  label: string;
  value: string;
}) => (
  <div className="flex items-start gap-2.5">
    <span className="mt-0.5 flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <HugeiconsIcon icon={icon} strokeWidth={1.8} className="size-3.5" />
    </span>
    <div>
      <p className="text-muted-foreground text-[11px] uppercase tracking-wide">{label}</p>
      <p className="font-medium text-sm">{value}</p>
    </div>
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
          <ol className="space-y-0">
            {(timeline.data ?? []).map((item, index, items) => (
              <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
                {index < items.length - 1 ? (
                  <span className="absolute top-3 left-[5px] h-full w-px bg-border" aria-hidden />
                ) : null}
                <span
                  className={`mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-white ring-1 ${
                    item.actorType === "agent"
                      ? "bg-blue-500 ring-blue-200"
                      : item.actorType === "human"
                        ? "bg-emerald-500 ring-emerald-200"
                        : "bg-slate-400 ring-slate-200"
                  }`}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="font-medium text-[13px]">{actionLabel(item.action)}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                  {describeAction(item.action, item.detail) ? (
                    <p className="mt-0.5 text-muted-foreground text-xs">
                      {describeAction(item.action, item.detail)}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
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
        <CardContent className="p-8 text-center text-muted-foreground">
          <p>This request could not be loaded.</p>
          {detail.error ? <p className="mt-2 font-mono text-xs">{detail.error.message}</p> : null}
        </CardContent>
      </Card>
    );
  }

  const request = detail.data.request;
  const recommendation = request.recommendation;
  const canApprove = me.data?.canApprove === true && request.status === "awaiting_approval";
  const quoteRows = quotes.data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <Button variant="ghost" size="sm" render={<Link to="/" />} className="-ml-2 mb-2">
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          Back to requests
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-semibold text-2xl tracking-tight">{request.title}</h1>
              <StatusBadge status={request.status} />
            </div>
            <p className="mt-1 max-w-2xl text-muted-foreground text-sm">{request.rawText}</p>
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
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetaItem
            icon={Store01Icon}
            label="Quantity"
            value={`${request.quantity} ${request.unit}`}
          />
          <MetaItem icon={Store01Icon} label="Deliver to" value={request.deliveryRegion} />
          <MetaItem icon={Calendar03Icon} label="Needed by" value={formatDate(request.neededBy)} />
          <MetaItem
            icon={MoneyBag02Icon}
            label="Budget"
            value={
              request.budgetCents === null
                ? "Not stated"
                : formatMoney(request.budgetCents, request.currency)
            }
          />
          <MetaItem
            icon={Clock01Icon}
            label="Quote deadline"
            value={`${formatDateTime(request.deadlineAt)} · ${
              request.status === "quoting" ? timeLeft(request.deadlineAt) : "quotes closed"
            }`}
          />
          <MetaItem icon={SparklesIcon} label="Priority" value={request.priority} />
          <MetaItem icon={Robot01Icon} label="Category" value={request.category} />
          <MetaItem
            icon={CheckmarkCircle02Icon}
            label="Invited"
            value={`${detail.data.invitations.length} vendors`}
          />
        </CardContent>
      </Card>

      {recommendation ? (
        <Card className="border-blue-200/70 bg-gradient-to-br from-blue-50/80 to-white shadow-none">
          <CardContent className="flex gap-3 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-4" />
            </span>
            <div>
              <p className="font-medium text-sm">Agent recommendation</p>
              <p className="mt-1 text-slate-700 text-sm leading-relaxed">{recommendation.reason}</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Scored {recommendation.quoteCount} quote
                {recommendation.quoteCount === 1 ? "" : "s"} ·{" "}
                {recommendation.winner
                  ? `recommended: ${recommendation.winner.vendorName}`
                  : "no quote met every requirement"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
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
                recommendation.ranked.map((quote) => (
                  <div
                    key={quote.quoteId}
                    className={`rounded-xl border p-4 ${
                      quote.rank === 1 && quote.tier === 1
                        ? "border-blue-200 bg-blue-50/40"
                        : "border-border/70"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full font-semibold text-sm ${
                            quote.tier === 1
                              ? "bg-blue-600 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {quote.rank}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{quote.vendorName}</p>
                            {quote.tier > 1 ? (
                              <Badge variant="outline" className="rounded-full text-[11px]">
                                Below requirements
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-muted-foreground text-sm">
                            {formatMoney(quote.totalPriceCents)} · {quote.quantityOffered} units ·
                            delivers {formatDate(quote.deliveryDate)} · {quote.warrantyMonths} mo
                            warranty
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg tabular-nums">
                          {(quote.scoreBps / 100).toFixed(1)}
                        </p>
                        <p className="text-muted-foreground text-[11px] uppercase tracking-wide">
                          score
                        </p>
                      </div>
                    </div>

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

                    {quote.aiReason ? (
                      <p className="mt-3 text-slate-600 text-sm leading-relaxed">
                        {quote.aiReason}
                      </p>
                    ) : null}

                    {canApprove ? (
                      <div className="mt-3 border-t pt-3">
                        <Button
                          size="sm"
                          onClick={() =>
                            approve.mutate({
                              requestId,
                              quoteId: quote.quoteId,
                              note: note.trim() || null,
                            })
                          }
                          disabled={approve.isPending}
                        >
                          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
                          Approve {quote.vendorName}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : quoteRows.length > 0 ? (
                quoteRows.map((quote) => (
                  <div
                    key={quote.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 p-4"
                  >
                    <div>
                      <p className="font-medium">{quote.vendorName}</p>
                      <p className="text-muted-foreground text-sm">
                        {formatMoney(quote.totalPriceCents)} · delivers{" "}
                        {formatDate(quote.deliveryDate)}
                      </p>
                    </div>
                    <StatusBadge status={quote.status} />
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed px-5 py-10 text-center">
                  <p className="font-medium text-sm">Waiting for the first quote</p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    Invited vendors get an email and an in-app notification. The agent chases anyone
                    who goes quiet.
                  </p>
                </div>
              )}

              {canApprove ? (
                <div className="rounded-xl bg-muted/60 p-3">
                  <label htmlFor="approval-note" className="font-medium text-xs">
                    Approval note (optional)
                  </label>
                  <Input
                    id="approval-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Why this quote?"
                    className="mt-1.5 bg-white"
                  />
                  <p className="mt-1.5 text-muted-foreground text-[11px]">
                    The note is recorded in the agent timeline. The agent never approves on its own.
                  </p>
                </div>
              ) : request.status === "awaiting_approval" ? (
                <p className="text-muted-foreground text-xs">
                  Only an organization approver can approve a quote. You can still review the
                  ranking.
                </p>
              ) : null}
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
                        ? `${invite.reminderCount} reminder${invite.reminderCount === 1 ? "" : "s"}`
                        : `invited ${formatDateTime(invite.invitedAt)}`}
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
