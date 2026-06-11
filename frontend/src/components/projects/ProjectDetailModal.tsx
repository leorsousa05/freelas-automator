import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Modal from '../ui/Modal'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Avatar from '../ui/Avatar'
import Skeleton from '../ui/Skeleton'
import Button from '../ui/Button'
import ProposalComposer from './ProposalComposer'
import { api } from '../../api'
import type { Project } from '../../types'
import { useState } from 'react'

interface ProjectDetailModalProps {
  project: Project | null
  accountId: string
  open: boolean
  onClose: () => void
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

export default function ProjectDetailModal({ project, accountId, open, onClose }: ProjectDetailModalProps) {
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerError, setComposerError] = useState('')
  const queryClient = useQueryClient()

  const { data: detailData, isLoading } = useQuery({
    queryKey: ['project-detail', project?.external_id, accountId],
    queryFn: ({ signal }) =>
      project ? api.projects.full(project.external_id, accountId, signal) : Promise.resolve(null),
    enabled: open && !!project,
  })

  const { data: subscription } = useQuery({
    queryKey: ['account-subscription', accountId],
    queryFn: ({ signal }) => api.accounts.subscription(accountId, signal),
    enabled: !!accountId,
  })

  const sendProposal = useMutation({
    mutationFn: (data: { offerValue: string; finalValue: string; durationDays: string; details: string }) => {
      if (!project) throw new Error('No project')
      return api.projects.sendProposal(project.external_id, {
        account_id: accountId,
        offer_value: data.offerValue,
        final_value: data.finalValue,
        duration_days: parseInt(data.durationDays) || 0,
        details: data.details,
      })
    },
    onSuccess: (res) => {
      if (res.success) {
        setComposerOpen(false)
        setComposerError('')
        queryClient.invalidateQueries({ queryKey: ['project-detail', project?.external_id] })
      } else {
        setComposerError(res.error || 'Erro ao enviar proposta')
      }
    },
    onError: (e: any) => {
      setComposerError(e.message || 'Erro ao enviar proposta')
    },
  })

  const modalProject = detailData?.detail ?? project
  const modalProposals = detailData?.proposals ?? []
  const cannotBid = !subscription?.has_subscription && modalProject && isRecentProject(modalProject)

  return (
    <Modal open={open} onClose={onClose} title={modalProject?.title || 'Detalhes do Projeto'} size="lg">
      {isLoading && <Skeleton />}
      {!isLoading && modalProject && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {modalProject.is_featured && <Badge variant="warning">Projeto em Destaque</Badge>}
            {modalProject.visibility && <Badge variant="info">{modalProject.visibility}</Badge>}
            {modalProject.allows_multiple_freelancers && <Badge variant="neutral">Múltiplos freelancers</Badge>}
            {modalProject.published_at && <Badge variant="neutral">Publicado: {modalProject.published_at}</Badge>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Categoria:</span>
              <p className="font-medium text-slate-900 dark:text-slate-50">{modalProject.category || '-'}</p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Subcategoria:</span>
              <p className="font-medium text-slate-900 dark:text-slate-50">{modalProject.subcategory || '-'}</p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Nível:</span>
              <p className="font-medium text-slate-900 dark:text-slate-50">{modalProject.experience_level || '-'}</p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Cliente:</span>
              <div className="flex items-center gap-2 mt-0.5">
                <Avatar src={modalProject.client_avatar} name={modalProject.client_name} size="sm" />
                <div>
                  <p className="font-medium">{modalProject.client_name || '-'}</p>
                  {modalProject.client_rating != null && (
                    <p className="text-xs text-amber-500">★ {modalProject.client_rating}</p>
                  )}
                </div>
              </div>
              {modalProject.client_last_seen && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{modalProject.client_last_seen}</p>
              )}
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Orçamento:</span>
              <p className="font-medium text-slate-900 dark:text-slate-50">
                {modalProject.budget_min && modalProject.budget_max
                  ? `R$ ${modalProject.budget_min} - R$ ${modalProject.budget_max}`
                  : modalProject.budget_min
                    ? `R$ ${modalProject.budget_min}+`
                    : '-'}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Propostas / Interessados:</span>
              <p className="font-medium text-slate-900 dark:text-slate-50">
                {modalProject.proposals_count ?? '-'} / {modalProject.interested_count ?? '-'}
              </p>
            </div>
          </div>

          {modalProject.description && (
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-sm">Descrição:</span>
              <p className="text-sm text-slate-800 dark:text-slate-200 mt-1 whitespace-pre-line">{modalProject.description}</p>
            </div>
          )}

          {modalProject.skills && modalProject.skills.length > 0 && (
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-sm">Habilidades:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {modalProject.skills.map((s) => (
                  <Badge key={s} variant="neutral">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Propostas ({modalProposals.length})</h3>
            {modalProposals.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma proposta encontrada.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {modalProposals.map((prop, idx) => (
                  <Card key={idx} padding="sm" className="bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-start gap-3">
                      <Avatar src={prop.freelancer_avatar} name={prop.freelancer_name} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{prop.freelancer_name}</span>
                          {prop.is_pro && <Badge variant="warning">PRO</Badge>}
                          {prop.is_premium && <Badge variant="info">Premium</Badge>}
                          {prop.is_identity_verified && <Badge variant="success">Verificado</Badge>}
                        </div>
                        {prop.freelancer_nickname && (
                          <p className="text-slate-500 dark:text-slate-400 text-xs">@{prop.freelancer_nickname}</p>
                        )}
                        {prop.freelancer_rating != null && (
                          <p className="text-xs text-amber-500">★ {prop.freelancer_rating}</p>
                        )}
                        {prop.status_badges.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {prop.status_badges.map((badge, bidx) => {
                              const variant =
                                badge === 'Aceita'
                                  ? 'success'
                                  : badge === 'Rejeitada'
                                    ? 'error'
                                    : badge === 'Promovida'
                                      ? 'info'
                                      : badge === 'Freelancer novo'
                                        ? 'info'
                                        : 'neutral'
                              return (
                                <Badge key={bidx} variant={variant}>{badge}</Badge>
                              )
                            })}
                          </div>
                        )}
                        {(prop.submitted_at || prop.offer_value || prop.final_value || prop.duration_days) && (
                          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                            {prop.submitted_at && <p>Submetido: {prop.submitted_at}</p>}
                            {prop.offer_value != null && <p>Oferta: R$ {prop.offer_value}</p>}
                            {prop.final_value != null && <p>Oferta final: R$ {prop.final_value}</p>}
                            {prop.duration_days != null && <p>Duração: {prop.duration_days} dias</p>}
                          </div>
                        )}
                        {prop.info && <p className="text-slate-600 dark:text-slate-400 mt-1 text-xs">{prop.info}</p>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
            {!composerOpen ? (
              <div className="space-y-2">
                {cannotBid && (
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400 text-xs">
                    Este projeto foi publicado nas últimas 24 horas e é exclusivo. Sem um plano pago no 99freelas, não é possível enviar propostas para projetos recentes.
                  </div>
                )}
                <Button onClick={() => setComposerOpen(true)} disabled={!!cannotBid}>
                  Enviar Proposta
                </Button>
              </div>
            ) : (
              <ProposalComposer
                onSubmit={(data) => {
                  setComposerError('')
                  sendProposal.mutate(data)
                }}
                onCancel={() => {
                  setComposerOpen(false)
                  setComposerError('')
                }}
                isLoading={sendProposal.isPending}
                error={composerError}
              />
            )}
          </div>

          {modalProject.url && (
            <a href={modalProject.url} target="_blank" rel="noreferrer" className="inline-block text-accent-600 dark:text-accent-400 text-sm hover:underline mt-2">
              Abrir no 99freelas →
            </a>
          )}
        </div>
      )}
    </Modal>
  )
}
