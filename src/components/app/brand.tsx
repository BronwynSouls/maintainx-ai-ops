import logo from "@/assets/maintainx-mark.png";
import { cn } from "@/lib/utils";

export function Brand({
  className,
  compact = false,
  inverted = false,
}: {
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <img
        src={logo}
        alt="MaintainX Consulting Group logo"
        width={512}
        height={512}
        className="size-8 shrink-0 rounded-md bg-azure/20 p-1"
      />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "text-[15px] font-bold tracking-tight",
              inverted ? "text-sidebar-foreground" : "text-foreground",
            )}
          >
            MaintainX
          </span>
          <span className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Consulting Group
          </span>
        </span>
      )}
    </span>
  );
}
