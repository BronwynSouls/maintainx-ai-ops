import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AppNotification } from "@/lib/notifications.functions";
import { cn } from "@/lib/utils";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Notification centre for receptionists and hotel managers. */
export function NotificationBell({
  notifications,
  unreadCount,
  markRead,
  markAllRead,
}: {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}) {
  const navigate = useNavigate();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-priority-critical px-1 text-[10px] font-bold text-priority-critical-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          )}
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                markRead(n.id);
                if (n.ticket_id) navigate({ to: "/tickets/$ticketId", params: { ticketId: n.ticket_id } });
              }}
              className={cn(
                "flex w-full flex-col items-start gap-0.5 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent",
                !n.read_at && "bg-accent/40",
              )}
            >
              <span
                className={cn(
                  "text-sm font-medium break-words",
                  n.severity === "critical" && "text-priority-critical",
                )}
              >
                {n.title}
              </span>
              {n.message && (
                <span className="text-xs break-words text-muted-foreground">{n.message}</span>
              )}
              <span className="text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
