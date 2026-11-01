import { ChevronRight, ListChecks } from 'lucide-react'
import type { Activity } from '../../types'
import { Card, CardHeader } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { ActivityRow } from './ActivityRow'

export function RecentActivities({
  activities,
  onShowAll,
  limit = 5,
}: {
  activities: Activity[]
  onShowAll?: () => void
  limit?: number
}) {
  const visible = activities.slice(0, limit)

  return (
    <Card className="card-pad">
      <CardHeader
        title="Ostatnie aktywności"
        hint={`${activities.length} sesji w bazie`}
        icon={<ListChecks className="h-4 w-4" />}
        action={
          onShowAll ? (
            <button type="button" onClick={onShowAll} className="btn-ghost px-2 py-1 text-xs">
              Wszystkie
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : null
        }
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Brak aktywności"
          description="Zsynchronizuj Garmina, aby zobaczyć ostatnie sesje."
        />
      ) : (
        <div className="mt-1 divide-soft">
          {visible.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </Card>
  )
}
