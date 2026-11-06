import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: number | string;
  hint?: string;
  featured?: boolean;
  className?: string;
};

export const StatCard = ({ label, value, hint, featured, className }: StatCardProps) => (
  <div className={cn("p-4", className)}>
    <p className="text-muted-foreground text-sm">{label}</p>
    <p
      className={cn(
        "mt-2 font-semibold tracking-tight tabular-nums",
        featured ? "text-3xl sm:text-4xl" : "text-2xl",
      )}
    >
      {value}
    </p>
    {hint ? <p className="mt-1 text-muted-foreground text-xs text-pretty">{hint}</p> : null}
  </div>
);
