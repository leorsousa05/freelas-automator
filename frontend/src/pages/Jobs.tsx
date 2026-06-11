import { useFetch } from '../hooks/useFetch'
import { api } from '../api'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import Skeleton from '../components/ui/Skeleton'
import Card from '../components/ui/Card'

export default function Jobs() {
  const { data: jobs, loading } = useFetch(api.jobs.list)

  if (loading) return <Skeleton />

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-6">Jobs de Scraping</h1>
      {jobs && (
        <Card padding="none">
          <DataTable
            rows={jobs}
            keyExtractor={(j) => j.id}
            columns={[
              { key: 'job_type', header: 'Tipo' },
              { key: 'status', header: 'Status', render: (j) => <StatusBadge status={j.status} /> },
              { key: 'started_at', header: 'Início' },
              { key: 'finished_at', header: 'Fim' },
              { key: 'items_scraped', header: 'Itens' },
              {
                key: 'error',
                header: 'Erro',
                render: (j) => (
                  <span className="text-rose-500 text-xs line-clamp-2">{j.error_message}</span>
                ),
              },
            ]}
          />
        </Card>
      )}
    </div>
  )
}
