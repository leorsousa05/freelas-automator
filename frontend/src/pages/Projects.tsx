import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api'
import Card from '../components/ui/Card'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Textarea from '../components/ui/Textarea'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import type { Project, Account, ProposalItem } from '../types'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'

const CACHE_MS = 5 * 60 * 1000

interface ListCacheEntry {
  projects: Project[]
  cachedAt: number
}

interface DetailCacheEntry {
  detail: Project
  proposals: ProposalItem[]
  cachedAt: number
}

function isStale(cachedAt: number) {
  return Date.now() - cachedAt > CACHE_MS
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

export default function Projects() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Record<string, string>>({})
  const [selectedAccount, setSelectedAccount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [page, setPage] = useState(1)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [subscription, setSubscription] = useState<{ has_subscription: boolean; plan_name: string | null } | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalProject, setModalProject] = useState<Project | null>(null)
  const [modalProposals, setModalProposals] = useState<ProposalItem[]>([])
  const [modalLoading, setModalLoading] = useState(false)

  const [composerOpen, setComposerOpen] = useState(false)
  const [composerLoading, setComposerLoading] = useState(false)
  const [composerError, setComposerError] = useState('')
  const [composerForm, setComposerForm] = useState({
    offerValue: '',
    finalValue: '',
    durationDays: '',
    details: '',
  })

  const listCacheRef = useRef<Map<string, ListCacheEntry>>(new Map())
  const detailCacheRef = useRef<Map<string, DetailCacheEntry>>(new Map())

  useEffect(() => {
    api.accounts.list().then(setAccounts).catch(() => {})
    api.accounts.categories().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      api.accounts.subscription(selectedAccount)
        .then(setSubscription)
        .catch(() => setSubscription(null))
    } else {
      setSubscription(null)
    }
  }, [selectedAccount])

  const fetchProjects = useCallback(async (targetPage: number, force = false) => {
    if (!selectedAccount) return
    const key = `${selectedAccount}:${selectedCategory || '_all_'}:${targetPage}`
    const cached = listCacheRef.current.get(key)

    if (!force && cached && !isStale(cached.cachedAt)) {
      setProjects(cached.projects)
      return
    }

    setLoading(true)
    setError('')
    try {
      const data = await api.projects.scrape(selectedAccount, selectedCategory || undefined, targetPage)
      listCacheRef.current.set(key, { projects: data.projects, cachedAt: Date.now() })
      setProjects(data.projects)
    } catch (e: any) {
      setError(e.message || 'Erro ao buscar projetos')
    } finally {
      setLoading(false)
    }
  }, [selectedAccount, selectedCategory])

  useEffect(() => {
    if (selectedAccount) {
      setPage(1)
      fetchProjects(1)
    } else {
      setProjects([])
    }
  }, [selectedAccount, selectedCategory])

  useEffect(() => {
    if (selectedAccount) {
      fetchProjects(page)
    }
  }, [page])

  const openProjectModal = async (project: Project) => {
    const cached = detailCacheRef.current.get(project.external_id)

    if (cached && !isStale(cached.cachedAt)) {
      setModalProject(cached.detail)
      setModalProposals(cached.proposals)
      setModalOpen(true)
      setModalLoading(false)
      refreshModal(project.external_id)
      return
    }

    setModalProject(project)
    setModalOpen(true)
    setModalLoading(true)
    setModalProposals([])
    try {
      const res = await api.projects.full(project.external_id, selectedAccount)
      detailCacheRef.current.set(project.external_id, {
        detail: res.detail,
        proposals: res.proposals,
        cachedAt: Date.now(),
      })
      setModalProject(res.detail)
      setModalProposals(res.proposals)
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar detalhes')
    } finally {
      setModalLoading(false)
    }
  }

  const refreshModal = async (externalId: string) => {
    try {
      const res = await api.projects.full(externalId, selectedAccount)
      detailCacheRef.current.set(externalId, {
        detail: res.detail,
        proposals: res.proposals,
        cachedAt: Date.now(),
      })
      setModalProject((current) => {
        if (current?.external_id === externalId) return res.detail
        return current
      })
      setModalProposals((current) => {
        if (modalProject?.external_id === externalId) return res.proposals
        return current
      })
    } catch {
      // silent fail
    }
  }

  const handleSendProposal = async () => {
    if (!modalProject || !selectedAccount) return
    setComposerLoading(true)
    setComposerError('')
    try {
      const res = await api.projects.sendProposal(modalProject.external_id, {
        account_id: selectedAccount,
        offer_value: composerForm.offerValue,
        final_value: composerForm.finalValue,
        duration_days: parseInt(composerForm.durationDays) || 0,
        details: composerForm.details,
      })
      if (res.success) {
        detailCacheRef.current.delete(modalProject.external_id)
        setComposerOpen(false)
        setComposerForm({ offerValue: '', finalValue: '', durationDays: '', details: '' })
        await refreshModal(modalProject.external_id)
      } else {
        setComposerError(res.error || 'Erro ao enviar proposta')
      }
    } catch (e: any) {
      setComposerError(e.message || 'Erro ao enviar proposta')
    } finally {
      setComposerLoading(false)
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-6">Buscar Projetos</h1>

      <Card className="mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Select
              label="Conta"
              value={selectedAccount}
              onChange={(e) => {
                setSelectedAccount(e.target.value)
                setProjects([])
                setError('')
              }}
            >
              <option value="">Selecione uma conta...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.username}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Select
              label="Categoria"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Todas as categorias</option>
              {Object.entries(categories).map(([slug, name]) => (
                <option key={slug} value={slug}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
          <Button
            onClick={() => fetchProjects(page, true)}
            disabled={loading || !selectedAccount}
            isLoading={loading}
          >
            <RefreshCw size={16} />
            Atualizar
          </Button>
        </div>
      </Card>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      {loading && <Skeleton />}

      {!loading && projects.length > 0 && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <span>{projects.length} projetos encontrados</span>
              {selectedCategory && (
                <span className="ml-1">(categoria: {categories[selectedCategory]})</span>
              )}
              <span className="ml-3 text-slate-400 dark:text-slate-500 text-xs">Dados ao vivo do 99freelas</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={14} />
                Anterior
              </Button>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 px-2">
                Página {page}
              </span>
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)}>
                Próxima
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {projects.map((p) => {
              const cannotBid = !subscription?.has_subscription && (p.is_exclusive || isRecentProject(p))
              return (
                <Card
                  key={p.external_id || p.id}
                  isHoverable
                  onClick={() => openProjectModal(p)}
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
                      <span title="Propostas">
                        📝 {p.proposals_count ?? 0}
                      </span>
                      <span title="Interessados">
                        👁 {p.interested_count ?? 0}
                      </span>
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
                        <Badge key={s} variant="neutral">
                          {s}
                        </Badge>
                      ))}
                      {p.skills.length > 6 && (
                        <Badge variant="neutral">+{p.skills.length - 6}</Badge>
                      )}
                    </div>
                  )}

                  {cannotBid && (
                    <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400 text-xs font-medium">
                      Projeto exclusivo. Sem plano pago no 99freelas, não é possível enviar propostas para projetos das
                      últimas 24 horas.
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </>
      )}

      {!loading && projects.length === 0 && selectedAccount && (
        <EmptyState title="Nenhum projeto encontrado" />
      )}

      {!loading && !selectedAccount && (
        <EmptyState
          title="Selecione uma conta"
          description="Escolha uma conta para buscar projetos do 99freelas"
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalProject?.title || 'Detalhes do Projeto'} size="lg">
        {modalLoading && <Skeleton />}
        {!modalLoading && modalProject && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {modalProject.is_featured && <Badge variant="warning">Projeto em Destaque</Badge>}
              {modalProject.visibility && <Badge variant="info">{modalProject.visibility}</Badge>}
              {modalProject.allows_multiple_freelancers && (
                <Badge variant="neutral">Múltiplos freelancers</Badge>
              )}
              {modalProject.published_at && (
                <Badge variant="neutral">Publicado: {modalProject.published_at}</Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Categoria:</span>
                <p className="font-medium text-slate-900 dark:text-slate-50">
                  {modalProject.category || '-'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Subcategoria:</span>
                <p className="font-medium text-slate-900 dark:text-slate-50">
                  {modalProject.subcategory || '-'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Nível:</span>
                <p className="font-medium text-slate-900 dark:text-slate-50">
                  {modalProject.experience_level || '-'}
                </p>
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
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {modalProject.client_last_seen}
                  </p>
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
                <p className="text-sm text-slate-800 dark:text-slate-200 mt-1 whitespace-pre-line">
                  {modalProject.description}
                </p>
              </div>
            )}

            {modalProject.skills && modalProject.skills.length > 0 && (
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-sm">Habilidades:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {modalProject.skills.map((s) => (
                    <Badge key={s} variant="neutral">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
                Propostas ({modalProposals.length})
              </h3>
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
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {prop.freelancer_name}
                            </span>
                            {prop.is_pro && <Badge variant="warning">PRO</Badge>}
                            {prop.is_premium && <Badge variant="info">Premium</Badge>}
                            {prop.is_identity_verified && (
                              <Badge variant="success">Verificado</Badge>
                            )}
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
                                  <Badge key={bidx} variant={variant}>
                                    {badge}
                                  </Badge>
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
                  {!subscription?.has_subscription && modalProject && isRecentProject(modalProject) && (
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400 text-xs">
                      Este projeto foi publicado nas últimas 24 horas e é exclusivo. Sem um plano pago no 99freelas, não
                      é possível enviar propostas para projetos recentes.
                    </div>
                  )}
                  <Button
                    onClick={() => setComposerOpen(true)}
                    disabled={!subscription?.has_subscription && !!modalProject && isRecentProject(modalProject)}
                  >
                    Enviar Proposta
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">Nova Proposta</h3>
                  {composerError && (
                    <div className="p-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-400 text-sm">
                      {composerError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="Sua oferta (R$)"
                      value={composerForm.offerValue}
                      onChange={(e) => setComposerForm((f) => ({ ...f, offerValue: e.target.value }))}
                      placeholder="0,00"
                    />
                    <Input
                      label="Oferta final (R$)"
                      value={composerForm.finalValue}
                      onChange={(e) => setComposerForm((f) => ({ ...f, finalValue: e.target.value }))}
                      placeholder="0,00"
                    />
                    <Input
                      label="Prazo (dias)"
                      type="number"
                      value={composerForm.durationDays}
                      onChange={(e) => setComposerForm((f) => ({ ...f, durationDays: e.target.value }))}
                      placeholder="7"
                    />
                  </div>
                  <Textarea
                    label="Detalhes da proposta"
                    value={composerForm.details}
                    onChange={(e) => setComposerForm((f) => ({ ...f, details: e.target.value }))}
                    rows={4}
                    placeholder="Descreva sua proposta..."
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {composerForm.details.length}/3000
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handleSendProposal} disabled={composerLoading} isLoading={composerLoading}>
                      Enviar
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setComposerOpen(false)
                        setComposerError('')
                      }}
                      disabled={composerLoading}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {modalProject.url && (
              <a
                href={modalProject.url}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-accent-600 dark:text-accent-400 text-sm hover:underline mt-2"
              >
                Abrir no 99freelas →
              </a>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
