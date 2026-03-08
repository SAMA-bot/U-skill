import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const StatsCardSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center">
          <Skeleton className="h-9 w-9 rounded-md shrink-0" />
          <div className="ml-3 flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-14" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const ChartSkeleton = ({ height = "h-64" }: { height?: string }) => (
  <Card>
    <CardHeader className="pb-3">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-3 w-56 mt-1" />
    </CardHeader>
    <CardContent>
      <div className={`${height} flex items-end gap-2 pt-4`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-md"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </CardContent>
  </Card>
);

export const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <Card>
    <CardHeader className="pb-3">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-3 w-48 mt-1" />
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex gap-4 pb-2 border-b border-border">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            {Array.from({ length: cols - 1 }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const ActionCardSkeleton = () => (
  <Card>
    <CardHeader className="pb-3">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-3 w-44 mt-1" />
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    </CardContent>
  </Card>
);

export const DashboardSkeleton = ({ statCount = 6 }: { statCount?: number }) => (
  <div className="space-y-8 animate-in fade-in duration-300">
    {/* Page header */}
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-36" />
      </div>
    </div>

    {/* Stats cards */}
    <StatsCardSkeleton count={statCount} />

    {/* Quick actions */}
    <ActionCardSkeleton />

    {/* Two-column layout */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <ChartSkeleton />
      <TableSkeleton />
    </div>

    {/* Bottom section */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <ChartSkeleton height="h-48" />
      <TableSkeleton rows={3} cols={3} />
      <ChartSkeleton height="h-48" />
    </div>
  </div>
);

export const FacultySkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-300">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
    <StatsCardSkeleton count={4} />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <TableSkeleton rows={3} cols={3} />
      <ChartSkeleton height="h-48" />
      <TableSkeleton rows={3} cols={2} />
    </div>
  </div>
);

export const HodSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-300">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
    </div>
    <StatsCardSkeleton count={4} />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton />
      <TableSkeleton rows={4} />
    </div>
  </div>
);
