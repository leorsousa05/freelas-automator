import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAccountStore } from '../stores/accountStore'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import ProjectFilters from '../components/projects/ProjectFilters'
import ProjectList from '../components/projects/ProjectList'
import ProjectDetailModal from '../components/projects/ProjectDetailModal'
import type { Project } from '../types'
import { api } from '../api'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Projects() {
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const queryClient = useQueryClient()

  const { selectedAccountId, selectedCategory } = useAccountStore()

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => api.accounts.categories(signal),
    staleTime: Infinity,
  })

  const { data: subscription } = useQuery({
    queryKey: ['account-subscription', selectedAccountId],
    queryFn: ({ signal }) =>
      selectedAccountId
        ? api.accounts.subscription(selectedAccountId, signal)
        : Promise.resolve(null),
    enabled: !!selectedAccountId,
  })

  const {
    data: projectsData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['projects', selectedAccountId, selectedCategory, page],
    queryFn: ({ signal }) =>
      selectedAccountId
        ? api.projects.scrape(selectedAccountId, selectedCategory || undefined, page, signal)
        : Promise.resolve(null),
    enabled: !!selectedAccountId,
  })

  const projects = projectsData?.projects ?? []

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] })
    refetch()
  }

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project)
    setModalOpen(true)
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-6">Buscar Projetos</h1>

      <Card className="mb-6">
        <ProjectFilters
          categories={categories ?? {}}
          isLoading={isFetching}
          onRefresh={handleRefresh}
        />
      </Card>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-400 text-sm">
          {error.message}
        </div>
      )}

      {isLoading && <Skeleton />}

      {!isLoading && projects.length > 0 && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <span>{projects.length} projetos encontrados</span>
              {selectedCategory && (
                <span className="ml-1">(categoria: {categories?.[selectedCategory]})</span>
              )}
              <span className="ml-3 text-slate-400 dark:text-slate-500 text-xs">Dados ao vivo do 99freelas</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft size={14} />
                Anterior
              </Button>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 px-2">Página {page}</span>
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)}>
                Próxima
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>

          <ProjectList
            projects={projects}
            subscription={subscription ?? null}
            onSelectProject={handleSelectProject}
          />
        </>
      )}

      {!isLoading && projects.length === 0 && selectedAccountId && (
        <EmptyState title="Nenhum projeto encontrado" />
      )}

      {!isLoading && !selectedAccountId && (
        <EmptyState title="Selecione uma conta" description="Escolha uma conta para buscar projetos do 99freelas" />
      )}

      <ProjectDetailModal
        project={selectedProject}
        accountId={selectedAccountId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
