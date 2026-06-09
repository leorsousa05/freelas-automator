import { useFetch } from '../hooks/useFetch'
import { api } from '../api'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import Skeleton from '../components/Skeleton'

export default function Proposals() {
  const { data: proposals, loading } = useFetch(api.proposals.list)

  if (loading) return <Skeleton />

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Propostas Enviadas</h1>
      {proposals && (
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
      )}
    </div>
  )
}
