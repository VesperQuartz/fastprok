import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Notification01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBrowserNotifications } from "@/providers/browser-notifications";

const BrowserAlertsState = ({ compact = false }: { compact?: boolean }) => {
  const { permission, enable } = useBrowserNotifications();

  if (permission === "checking" || permission === "unsupported") {
    return null;
  }

  if (permission === "granted") {
    return (
      <span
        className={`flex items-center gap-1.5 text-emerald-700 ${compact ? "text-xs" : "text-sm"}`}
      >
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          strokeWidth={2}
          className={compact ? "size-3.5" : "size-4"}
        />
        {compact ? "On" : "Browser alerts on"}
      </span>
    );
  }

  if (permission === "denied") {
    return (
      <span
        className="text-muted-foreground text-xs"
        title="Allow notifications for this site in your browser settings."
      >
        {compact ? "Blocked in settings" : "Browser alerts blocked"}
      </span>
    );
  }

  return (
    <Button
      variant="outline"
      size={compact ? "xs" : "sm"}
      className={compact ? "h-7" : undefined}
      onClick={async () => {
        const result = await enable();

        if (result === "granted") {
          toast.success("Browser alerts enabled.");
        } else if (result === "denied") {
          toast.error("Browser alerts are blocked in your browser settings.");
        }
      }}
    >
      <HugeiconsIcon icon={Notification01Icon} strokeWidth={2} />
      Enable browser alerts
    </Button>
  );
};

export const BrowserAlertsRow = () => {
  const { permission } = useBrowserNotifications();

  if (permission === "checking" || permission === "unsupported") {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-4 py-2">
      <span className="text-muted-foreground text-xs">Browser alerts</span>
      <BrowserAlertsState compact />
    </div>
  );
};

export const BrowserAlertsButton = () => <BrowserAlertsState />;
