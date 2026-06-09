import { useFetch } from '../hooks/useFetch'
import { api } from '../api'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import Skeleton from '../components/Skeleton'

export default function Projects() {
  const { data: projects, loading } = useFetch(api.projects.list)

  if (loading) return <Skeleton />

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Projetos</h1>
      {projects && (
        <DataTable
          rows={projects}
          keyExtractor={(p) => p.id}
          columns={[
            { key: 'title', header: 'Projeto' },
            { key: 'category', header: 'Categoria' },
            {
              key: 'budget',
              header: 'Orçamento',
              render: (p) =>
                p.budget_min && p.budget_max
                  ? `R$ ${p.budget_min} - R$ ${p.budget_max}`
                  : '-',
            },
            { key: 'is_new', header: 'Status', render: (p) => <StatusBadge status={p.is_new ? 'new' : 'sent'} /> },
            {
              key: 'url',
              header: 'Link',
              render: (p) =>
                p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline">
                    Ver →
                  </a>
                ) : (
                  '-'
                ),
            },
          ]}
        />
      )}
    </div>
  )
}
