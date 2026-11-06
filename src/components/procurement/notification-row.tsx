import { HugeiconsIcon } from "@hugeicons/react";
import {
  BellIcon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  FileAttachmentIcon,
  Invoice01Icon,
  Mail01Icon,
  SentIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "./format";

export type NotificationRowItem = {
  id: string;
  href: string | null;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

const iconFor = (type: string) => {
  switch (type) {
    case "request.invited":
      return Mail01Icon;
    case "request.sent":
      return SentIcon;
    case "quote.received":
      return Invoice01Icon;
    case "quote.proforma":
      return FileAttachmentIcon;
    case "request.reminder":
      return Clock01Icon;
    case "request.ranked":
      return SparklesIcon;
    case "quote.won":
    case "request.approved":
      return CheckmarkCircle02Icon;
    case "quote.lost":
    case "request.no_quotes":
      return CancelCircleIcon;
    default:
      return BellIcon;
  }
};

const toneFor = (type: string) => {
  if (type === "quote.won" || type === "request.approved") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (type === "quote.lost" || type === "request.no_quotes") {
    return "bg-muted text-muted-foreground";
  }

  if (type === "quote.proforma" || type === "request.ranked") {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-muted text-muted-foreground";
};

export const NotificationRow = ({ item }: { item: NotificationRowItem }) => (
  <a
    href={`/api/notifications/${item.id}/open`}
    aria-label={`${item.title}${item.readAt ? "" : ", unread"}`}
    className={cn(
      "flex w-full items-start gap-3 border-border/60 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset focus-visible:outline-none",
      !item.readAt && "bg-blue-50/40",
    )}
  >
    <span
      className={cn(
        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
        toneFor(item.type),
      )}
    >
      <HugeiconsIcon icon={iconFor(item.type)} strokeWidth={1.8} className="size-4" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "truncate text-sm",
            item.readAt ? "text-foreground/80" : "font-medium text-foreground",
          )}
        >
          {item.title}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {formatRelativeTime(item.createdAt)}
        </span>
      </span>
      <span className="mt-0.5 line-clamp-2 block text-muted-foreground text-xs">{item.body}</span>
    </span>
    {item.readAt ? null : <span className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-600" />}
  </a>
);
