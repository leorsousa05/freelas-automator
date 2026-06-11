import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import Skeleton from '../components/ui/Skeleton'
import Card from '../components/ui/Card'

export default function Proposals() {
  const { data: proposals, isLoading } = useQuery({
    queryKey: ['proposals'],
    queryFn: ({ signal }) => api.proposals.list(undefined, signal),
  })

  if (isLoading) return <Skeleton />

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-6">Propostas Enviadas</h1>
      {proposals && (
        <Card padding="none">
          <DataTable
            rows={proposals}
            keyExtractor={(p) => p.id}
            columns={[
              { id: 'external_id', header: 'ID' },
              {
                id: 'value',
                header: 'Valor',
                accessor: (p) => (p.value ? `R$ ${p.value}` : '-'),
              },
              {
                id: 'delivery_time_days',
                header: 'Prazo',
                accessor: (p) => (p.delivery_time_days ? `${p.delivery_time_days} dias` : '-'),
              },
              { id: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
              { id: 'sent_at', header: 'Enviada em' },
            ]}
          />
        </Card>
      )}
    </div>
  )
}
