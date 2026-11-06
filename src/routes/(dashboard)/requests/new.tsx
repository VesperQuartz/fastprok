import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Robot01Icon,
  Search01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import type { CategoryId } from "@/domain/categories";
import type { RequestPriority } from "@/repo/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/lib/orpc/client";

const CATEGORY_OPTIONS = [
  { value: "", label: "Let the agent decide" },
  { value: "computer-peripherals", label: "Computer peripherals" },
  { value: "office-furniture", label: "Office furniture" },
  { value: "office-supplies", label: "Stationery and office supplies" },
];

const PRIORITY_OPTIONS = [
  { value: "balanced", label: "Balanced" },
  { value: "cost", label: "Lowest price" },
  { value: "speed", label: "Fastest delivery" },
  { value: "reliability", label: "Most reliable" },
];

const Step = ({ icon, title, body }: { icon: typeof Robot01Icon; title: string; body: string }) => (
  <div className="flex gap-3">
    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
      <HugeiconsIcon icon={icon} strokeWidth={1.8} className="size-4" />
    </span>
    <div>
      <p className="font-medium text-sm">{title}</p>
      <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">{body}</p>
    </div>
  </div>
);

const NewRequestPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("unit");
  const [region, setRegion] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [budget, setBudget] = useState("");
  const [priority, setPriority] = useState("balanced");
  const [windowMinutes, setWindowMinutes] = useState("10");

  const createRequest = useMutation(
    orpc.requests.create.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries();
        toast.success(
          `Request sent to ${result.invitedVendorCount} vendor${result.invitedVendorCount === 1 ? "" : "s"}.`,
        );
        await navigate({ to: "/requests/$requestId", params: { requestId: result.requestId } });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (description.trim().length < 10) {
      toast.error("Describe what you need in at least 10 characters.");
      return;
    }

    createRequest.mutate({
      rawText: description.trim(),
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(category ? { category: category as CategoryId } : {}),
      ...(quantity ? { quantity: Number(quantity) } : {}),
      ...(unit.trim() ? { unit: unit.trim() } : {}),
      ...(region.trim() ? { deliveryRegion: region.trim() } : {}),
      ...(neededBy ? { neededBy } : {}),
      ...(budget ? { budgetCents: Math.round(Number(budget) * 100) } : {}),
      ...(priority ? { priority: priority as RequestPriority } : {}),
      ...(windowMinutes ? { quotingWindowMinutes: Number(windowMinutes) } : {}),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" render={<Link to="/" />} className="-ml-2 mb-2">
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          Back to requests
        </Button>
        <h1 className="font-semibold text-2xl tracking-tight text-balance sm:text-3xl">
          What do you need?
        </h1>
        <p className="mt-1 max-w-2xl text-muted-foreground text-sm text-pretty">
          Describe it in plain language. The agent fills the gaps.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <Card className="border-border/70 shadow-none">
          <CardContent className="space-y-5 p-5">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="We need 20 wireless mice for the Finance team in Lagos by 13 November. Budget is around $600."
                className="min-h-32 text-sm"
                required
              />
              <p className="text-muted-foreground text-xs">
                Quantity, location, and needed-by date help.
              </p>
            </div>

            <div className="border-t pt-5">
              <h2 className="font-medium text-sm">Details</h2>
              <p className="mt-0.5 text-muted-foreground text-xs">Optional.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Title (optional)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Wireless mice"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <NativeSelect
                  id="category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <NativeSelect
                  id="priority"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  className="w-full"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                  placeholder="unit"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">Delivery region</Label>
                <Input
                  id="region"
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  placeholder="Lagos"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neededBy">Needed by</Label>
                <Input
                  id="neededBy"
                  type="date"
                  value={neededBy}
                  onChange={(event) => setNeededBy(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Budget (USD, optional)</Label>
                <Input
                  id="budget"
                  type="number"
                  min={0}
                  step="0.01"
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                  placeholder="600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="window">Deadline (minutes)</Label>
                <Input
                  id="window"
                  type="number"
                  min={1}
                  value={windowMinutes}
                  onChange={(event) => setWindowMinutes(event.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t pt-4">
              <Button type="submit" disabled={createRequest.isPending}>
                {createRequest.isPending ? "Agent is reading your request…" : "Send to the agent"}
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
              </Button>
              <p className="text-muted-foreground text-xs">
                Vendors never see your budget. They quote in the app.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit border-border/70 shadow-none">
          <CardContent className="p-5">
            <details>
              <summary className="cursor-pointer font-medium text-sm">How this works</summary>
              <div className="mt-4 space-y-4">
                <Step
                  icon={Robot01Icon}
                  title="Reads the request"
                  body="Vultr inference structures it."
                />
                <Step
                  icon={Search01Icon}
                  title="Finds vendors"
                  body="Rules match category and region."
                />
                <Step
                  icon={SparklesIcon}
                  title="Ranks the quotes"
                  body="Cost, speed, reliability, and warranty."
                />
                <p className="border-t pt-3 text-muted-foreground text-xs">An approver decides.</p>
              </div>
            </details>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export const Route = createFileRoute("/(dashboard)/requests/new")({
  component: NewRequestPage,
});
