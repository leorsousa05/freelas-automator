import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import Skeleton from '../components/ui/Skeleton'
import Card from '../components/ui/Card'

export default function Jobs() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: ({ signal }) => api.jobs.list(signal),
  })

  if (isLoading) return <Skeleton />

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-6">Jobs de Scraping</h1>
      {jobs && (
        <Card padding="none">
          <DataTable
            rows={jobs}
            keyExtractor={(j) => j.id}
            columns={[
              { id: 'job_type', header: 'Tipo' },
              { id: 'status', header: 'Status', render: (j) => <StatusBadge status={j.status} /> },
              { id: 'started_at', header: 'Início' },
              { id: 'finished_at', header: 'Fim' },
              { id: 'items_scraped', header: 'Itens' },
              {
                id: 'error',
                header: 'Erro',
                render: (j) => <span className="text-rose-500 text-xs line-clamp-2">{j.error_message}</span>,
              },
            ]}
          />
        </Card>
      )}
    </div>
  )
}
