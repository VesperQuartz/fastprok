import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatDate, formatDateTime, formatMoney } from "@/components/procurement/format";
import { ProformaCard } from "@/components/procurement/proforma-card";
import { StatusBadge } from "@/components/procurement/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/lib/orpc/client";

const Meta = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-muted-foreground text-xs">{label}</dt>
    <dd className="mt-1 font-medium text-sm">{value}</dd>
  </div>
);

const VendorRequestPage = () => {
  const { requestId } = Route.useParams();
  const queryClient = useQueryClient();
  const detail = useQuery(orpc.vendor.get.queryOptions({ input: { requestId } }));
  const [unitPrice, setUnitPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [warranty, setWarranty] = useState("0");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");

  const quote = detail.data?.quote ?? null;

  useEffect(() => {
    if (!quote) {
      return;
    }

    setUnitPrice((quote.unitPriceCents / 100).toFixed(2));
    setQuantity(String(quote.quantityOffered));
    setDeliveryDate(quote.deliveryDate);
    setWarranty(String(quote.warrantyMonths));
    setValidUntil(quote.validUntil ?? "");
    setNotes(quote.notes ?? "");
  }, [quote?.id, quote?.updatedAt]);

  const submit = useMutation(
    orpc.vendor.submit.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries();
        toast.success(
          result.status === "created"
            ? "Quote submitted. You can edit it until the deadline."
            : `Quote updated to version ${result.version}.`,
        );
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (detail.isPending) {
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
          This request could not be loaded.
        </CardContent>
      </Card>
    );
  }

  const request = detail.data.request;
  const isOpen =
    request.status === "quoting" && new Date(request.deadlineAt).getTime() > Date.now();
  const won = quote?.status === "won";
  const lost = quote?.status === "lost";

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const cents = Math.round(Number(unitPrice) * 100);

    if (!Number.isFinite(cents) || cents < 1) {
      toast.error("Enter a unit price greater than zero.");
      return;
    }

    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
      toast.error("Enter how many units you can supply.");
      return;
    }

    if (!deliveryDate) {
      toast.error("Choose a delivery date.");
      return;
    }

    submit.mutate({
      requestId,
      unitPriceCents: cents,
      quantityOffered: Number(quantity),
      deliveryDate,
      warrantyMonths: Number(warranty) || 0,
      validUntil: validUntil || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <Button variant="ghost" size="sm" render={<Link to="/" />} className="-ml-2 mb-2">
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          Back to invitations
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-semibold text-2xl tracking-tight">{request.title}</h1>
          <StatusBadge status={request.status} />
          {quote ? <StatusBadge status={quote.status} /> : null}
        </div>
        <p className="mt-1 text-muted-foreground text-sm text-pretty">
          {request.quantity} {request.unit} for {request.deliveryRegion}. Needed by{" "}
          {formatDate(request.neededBy)}.
        </p>
      </div>

      <Card className="border-border/70 shadow-none">
        <CardContent className="p-5">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <Meta label="Quantity" value={`${request.quantity} ${request.unit}`} />
            <Meta label="Deliver to" value={request.deliveryRegion} />
            <Meta label="Needed by" value={formatDate(request.neededBy)} />
            <Meta label="Quotes close" value={formatDateTime(request.deadlineAt)} />
          </dl>
        </CardContent>
      </Card>

      {won ? (
        <Card className="border-emerald-200 bg-emerald-50 shadow-none">
          <CardContent className="flex items-center gap-3 p-4">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              strokeWidth={2}
              className="size-5 text-emerald-600"
            />
            <div>
              <p className="font-medium text-emerald-800 text-sm">Your quote was accepted</p>
              <p className="text-emerald-700 text-xs">The buyer will contact you about delivery.</p>
            </div>
          </CardContent>
        </Card>
      ) : lost ? (
        <Card className="border-border/70 shadow-none">
          <CardContent className="p-4 text-muted-foreground text-sm">
            This request closed and another quote was approved. Thanks for responding.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <Card className="border-border/70 shadow-none">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">{quote ? "Your quote" : "Submit a quote"}</CardTitle>
              {quote ? (
                <span className="text-muted-foreground text-xs">Version {quote.version}</span>
              ) : null}
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="unitPrice">Unit price (NGN)</Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={unitPrice}
                      onChange={(event) => setUnitPrice(event.target.value)}
                      placeholder="45000"
                      disabled={!isOpen}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity offered</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      placeholder={String(request.quantity)}
                      disabled={!isOpen}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryDate">Delivery date</Label>
                    <Input
                      id="deliveryDate"
                      type="date"
                      value={deliveryDate}
                      onChange={(event) => setDeliveryDate(event.target.value)}
                      disabled={!isOpen}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validUntil">Valid until (optional)</Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={validUntil}
                      onChange={(event) => setValidUntil(event.target.value)}
                      disabled={!isOpen}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warranty">Warranty (months)</Label>
                    <Input
                      id="warranty"
                      type="number"
                      min={0}
                      value={warranty}
                      onChange={(event) => setWarranty(event.target.value)}
                      disabled={!isOpen}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Delivery included. Prices valid for 30 days."
                      disabled={!isOpen}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                  {isOpen ? (
                    <>
                      <Button type="submit" disabled={submit.isPending}>
                        {submit.isPending ? "Saving…" : quote ? "Update quote" : "Submit quote"}
                      </Button>
                      <p className="text-muted-foreground text-xs">
                        Editing keeps every earlier version. The latest version is the one scored.
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      This request is no longer accepting quotes.
                    </p>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <ProformaCard
            requestId={requestId}
            quoteId={quote?.id ?? null}
            canUpload={isOpen && Boolean(quote)}
            document={quote?.document ?? null}
          />
        </div>

        <Card className="h-fit border-border/70 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quote summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {quote ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(quote.totalPriceCents)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Unit price</span>
                  <span className="tabular-nums">{formatMoney(quote.unitPriceCents)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>{formatDate(quote.deliveryDate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Warranty</span>
                  <span>{quote.warrantyMonths} months</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={quote.status} />
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-xs">
                You have not quoted this request yet. Quotes are private: the buyer sees yours,
                other vendors never do.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/(dashboard)/vendor/requests/$requestId")({
  component: VendorRequestPage,
});
