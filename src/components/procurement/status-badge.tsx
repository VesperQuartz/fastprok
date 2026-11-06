import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  quoting: "border-sky-200 bg-sky-50 text-sky-700",
  awaiting_approval: "border-amber-200 bg-amber-50 text-amber-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  no_quotes: "border-rose-200 bg-rose-50 text-rose-700",
  needs_human: "border-amber-200 bg-amber-50 text-amber-800",
  cancelled: "border-border bg-muted text-muted-foreground",
  draft: "border-border bg-muted text-muted-foreground",
  invited: "border-sky-200 bg-sky-50 text-sky-700",
  responded: "border-emerald-200 bg-emerald-50 text-emerald-700",
  declined: "border-border bg-muted text-muted-foreground",
  expired: "border-border bg-muted text-muted-foreground",
  submitted: "border-sky-200 bg-sky-50 text-sky-700",
  won: "border-emerald-200 bg-emerald-50 text-emerald-700",
  lost: "border-border bg-muted text-muted-foreground",
  withdrawn: "border-border bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  quoting: "Collecting quotes",
  awaiting_approval: "Awaiting approval",
  approved: "Approved",
  no_quotes: "No quotes",
  needs_human: "Needs a human",
  cancelled: "Cancelled",
  draft: "Draft",
  invited: "Invited",
  responded: "Responded",
  declined: "Declined",
  expired: "Expired",
  submitted: "Submitted",
  won: "Won",
  lost: "Not selected",
  withdrawn: "Withdrawn",
};

export const StatusBadge = ({ status, className }: { status: string; className?: string }) => (
  <Badge
    variant="outline"
    className={cn("rounded-full px-2.5 py-0.5 font-medium", STATUS_STYLES[status], className)}
  >
    {STATUS_LABELS[status] ?? status}
  </Badge>
);
