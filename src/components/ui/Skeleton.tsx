import { cn } from '../../lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('card card-pad space-y-4', className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-full" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <CardSkeleton className="h-64" />
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <CardSkeleton className="h-72 lg:col-span-2" />
        <CardSkeleton className="h-72" />
      </div>
    </div>
  )
}
