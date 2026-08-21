import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lightbulb } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnalytics } from "@/lib/analytics.functions";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — MaintainX" },
      {
        name: "description",
        content: "Maintenance analytics, resolution performance and business insights.",
      },
      { property: "og:title", content: "Reports — MaintainX" },
      {
        property: "og:description",
        content: "Maintenance analytics, resolution performance and business insights.",
      },
    ],
  }),
  component: ReportsPage,
});

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function duration(minutes: number | null) {
  if (minutes == null) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 60 * 24) return `${(minutes / 60).toFixed(1)} h`;
  return `${(minutes / 1440).toFixed(1)} d`;
}

function ReportsPage() {
  const fetchAnalytics = useServerFn(getAnalytics);
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => fetchAnalytics(),
  });

  if (isLoading || !data) {
    return (
      <AppShell title="Reports" description="Maintenance analytics and business insights">
        <Skeleton className="h-96 w-full" />
      </AppShell>
    );
  }

  const cards = [
    { label: "Total tickets", value: data.totals.total },
    { label: "Open", value: data.totals.open },
    { label: "Resolved", value: data.totals.resolved },
    { label: "Critical", value: data.totals.critical },
    { label: "Avg. time to assign", value: duration(data.averages.assignmentMinutes) },
    { label: "Avg. resolution time", value: duration(data.averages.resolutionMinutes) },
  ];

  return (
    <AppShell title="Reports" description="Maintenance analytics and business insights">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="surface-panel p-5">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <ChartPanel title="Tickets created (last 14 days)">
          <LineChart data={data.overTime}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--foreground)",
              }}
            />
            <Line type="monotone" dataKey="value" name="Tickets" stroke="var(--chart-1)" strokeWidth={2} />
          </LineChart>
        </ChartPanel>

        <ChartPanel title="Tickets by category">
          <BarChart data={data.byCategory}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--foreground)",
              }}
            />
            <Bar dataKey="value" name="Tickets" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartPanel>

        <ChartPanel title="Resolved vs unresolved">
          <PieChart>
            <Pie
              data={data.resolvedSplit}
              dataKey="value"
              nameKey="label"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
            >
              {data.resolvedSplit.map((entry, index) => (
                <Cell key={entry.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--foreground)",
              }}
            />
          </PieChart>
        </ChartPanel>

        <ChartPanel title="Priority distribution">
          <PieChart>
            <Pie data={data.byPriority} dataKey="value" nameKey="label" outerRadius={90}>
              {data.byPriority.map((entry, index) => (
                <Cell key={entry.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--foreground)",
              }}
            />
          </PieChart>
        </ChartPanel>

        <ChartPanel title="Technician workload">
          <BarChart data={data.workload}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--foreground)",
              }}
            />
            <Legend />
            <Bar dataKey="open" name="Open" stackId="a" fill="var(--chart-1)" />
            <Bar dataKey="resolved" name="Resolved" stackId="a" fill="var(--chart-3)" />
          </BarChart>
        </ChartPanel>

        <ChartPanel title="Tickets by status">
          <BarChart data={data.byStatus} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--foreground)",
              }}
            />
            <Bar dataKey="value" name="Tickets" fill="var(--chart-4)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartPanel>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="surface-panel p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="size-4 text-primary" aria-hidden /> Business insights
          </h2>
          <ul className="mt-3 space-y-2">
            {data.insights.map((insight) => (
              <li key={insight} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                {insight}
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-panel">
          <header className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Most reported locations</h2>
          </header>
          <ul className="divide-y divide-border">
            {data.topLocations.length === 0 && (
              <li className="px-5 py-4 text-sm text-muted-foreground">No location data yet.</li>
            )}
            {data.topLocations.map((location) => (
              <li key={location.label} className="flex items-center justify-between px-5 py-3">
                <span className="truncate text-sm text-muted-foreground">{location.label}</span>
                <span className="text-sm font-semibold">{location.value}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <section className="surface-panel p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
