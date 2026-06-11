import { useFetch } from '../hooks/useFetch'
import { api } from '../api'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import Skeleton from '../components/ui/Skeleton'
import Card from '../components/ui/Card'

export default function Proposals() {
  const { data: proposals, loading } = useFetch(api.proposals.list)

  if (loading) return <Skeleton />

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-6">Propostas Enviadas</h1>
      {proposals && (
        <Card padding="none">
          <DataTable
            rows={proposals}
            keyExtractor={(p) => p.id}
            columns={[
              { key: 'external_id', header: 'ID' },
              {
                key: 'value',
                header: 'Valor',
                render: (p) => (p.value ? `R$ ${p.value}` : '-'),
              },
              {
                key: 'delivery_time_days',
                header: 'Prazo',
                render: (p) => (p.delivery_time_days ? `${p.delivery_time_days} dias` : '-'),
              },
              { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
              { key: 'sent_at', header: 'Enviada em' },
            ]}
          />
        </Card>
      )}
    </div>
  )
}
