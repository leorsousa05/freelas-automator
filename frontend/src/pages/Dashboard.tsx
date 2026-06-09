import { useFetch } from '../hooks/useFetch'
import { api } from '../api'
import Skeleton from '../components/Skeleton'

export default function Dashboard() {
  const { data: stats, loading } = useFetch(api.dashboard.stats)

  if (loading) return <Skeleton count={4} />
  if (!stats) return <div>Erro ao carregar stats</div>

  const cards = [
    { label: 'Projetos Novos', value: stats.new_projects, color: 'text-yellow-600' },
    { label: 'Mensagens Não Lidas', value: stats.unread_messages, color: 'text-red-600' },
    { label: 'Propostas Pendentes', value: stats.pending_proposals, color: 'text-gray-600' },
    { label: 'Contas Ativas', value: stats.active_accounts, color: 'text-green-600' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-lg p-5 shadow-sm">
            <div className="text-xs text-gray-500 uppercase tracking-wide">{c.label}</div>
            <div className={`text-3xl font-bold mt-1 ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
