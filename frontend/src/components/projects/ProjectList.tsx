import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Avatar from '../ui/Avatar'
import type { Project } from '../../types'

interface ProjectListProps {
  projects: Project[]
  subscription: { has_subscription: boolean; plan_name: string | null } | null
  onSelectProject: (project: Project) => void
}

function isRecentProject(project: Project): boolean {
  if (!project.published_at) return false
  try {
    const published = new Date(project.published_at)
    const hoursAgo = (Date.now() - published.getTime()) / (1000 * 60 * 60)
    return hoursAgo <= 24
  } catch {
    return false
  }
}

export default function ProjectList({ projects, subscription, onSelectProject }: ProjectListProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {projects.map((p) => {
        const cannotBid = !subscription?.has_subscription && (p.is_exclusive || isRecentProject(p))
        return (
          <Card
            key={p.external_id || p.id}
            isHoverable
            onClick={() => onSelectProject(p)}
            className={cannotBid ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/10' : ''}
          >
            <div className="flex flex-wrap items-start gap-2 mb-2">
              <h3 className="font-semibold text-slate-900 dark:text-slate-50 text-base leading-tight flex-1">
                {p.title}
              </h3>
              <div className="flex items-center gap-1 flex-shrink-0">
                {p.is_featured && <Badge variant="warning">Destaque</Badge>}
                {p.is_urgent && <Badge variant="error">Urgente</Badge>}
                {cannotBid && (
                  <Badge variant="neutral" className="border border-amber-200 dark:border-amber-800">
                    Exclusivo
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {p.subcategory || p.category || '-'}
              </span>
              <span>•</span>
              <span>{p.experience_level || '-'}</span>
              <span>•</span>
              <span>Publicado: {p.published_at || '-'}</span>
              {p.time_remaining && (
                <>
                  <span>•</span>
                  <span>Resta: {p.time_remaining}</span>
                </>
              )}
            </div>

            {p.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                {p.description}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Avatar src={p.client_avatar} name={p.client_name} size="md" />
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {p.client_name || 'Cliente anônimo'}
                  </p>
                  <div className="flex items-center gap-1 text-xs">
                    {p.client_rating != null ? (
                      <>
                        <span className="text-amber-500">★ {p.client_rating}</span>
                        {p.client_reviews_count != null && (
                          <span className="text-slate-400 dark:text-slate-500">
                            ({p.client_reviews_count} avaliações)
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">Sem feedback</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>📝 {p.proposals_count ?? 0}</span>
                <span>👁 {p.interested_count ?? 0}</span>
                {p.budget_min && (
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {p.budget_max && p.budget_max !== p.budget_min
                      ? `R$ ${p.budget_min} – R$ ${p.budget_max}`
                      : `R$ ${p.budget_min}+`}
                  </span>
                )}
              </div>
            </div>

            {p.skills && p.skills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {p.skills.slice(0, 6).map((s) => (
                  <Badge key={s} variant="neutral">{s}</Badge>
                ))}
                {p.skills.length > 6 && (
                  <Badge variant="neutral">+{p.skills.length - 6}</Badge>
                )}
              </div>
            )}

            {cannotBid && (
              <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400 text-xs font-medium">
                Projeto exclusivo. Sem plano pago no 99freelas, não é possível enviar propostas para projetos das últimas 24 horas.
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
