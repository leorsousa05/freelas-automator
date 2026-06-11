import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import Card from '../components/ui/Card'
import Skeleton from '../components/ui/Skeleton'
import { FolderOpen, MessageSquare, Send, Users } from 'lucide-react'

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: ({ signal }) => api.dashboard.stats(signal),
  })

  if (isLoading) return <Skeleton count={4} />
  if (!stats) return <div className="text-rose-500">Erro ao carregar stats</div>

  const cards = [
    {
      label: 'Projetos Novos',
      value: stats.new_projects,
      icon: FolderOpen,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: 'Mensagens Não Lidas',
      value: stats.unread_messages,
      icon: MessageSquare,
      color: 'text-rose-500',
      bg: 'bg-rose-50 dark:bg-rose-900/20',
    },
    {
      label: 'Propostas Pendentes',
      value: stats.pending_proposals,
      icon: Send,
      color: 'text-slate-500 dark:text-slate-400',
      bg: 'bg-slate-50 dark:bg-slate-800',
    },
    {
      label: 'Contas Ativas',
      value: stats.active_accounts,
      icon: Users,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
  ]

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.label} padding="lg">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${c.bg}`}>
                  <Icon size={24} className={c.color} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{c.label}</div>
                  <div className={`text-3xl font-bold mt-0.5 ${c.color}`}>{c.value}</div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
