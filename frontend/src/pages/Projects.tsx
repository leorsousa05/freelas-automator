import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import Skeleton from '../components/Skeleton'
import Modal from '../components/Modal'
import type { Project, Account, ProposalItem } from '../types'

const CACHE_MS = 5 * 60 * 1000 // 5 minutes

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

export default function Projects() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Record<string, string>>({})
  const [selectedAccount, setSelectedAccount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [page, setPage] = useState(1)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [modalProject, setModalProject] = useState<Project | null>(null)
  const [modalProposals, setModalProposals] = useState<ProposalItem[]>([])
  const [modalLoading, setModalLoading] = useState(false)

  const listCacheRef = useRef<Map<string, ListCacheEntry>>(new Map())
  const detailCacheRef = useRef<Map<string, DetailCacheEntry>>(new Map())

  // Load accounts and categories on mount
  useEffect(() => {
    api.accounts.list().then(setAccounts).catch(() => {})
    api.accounts.categories().then(setCategories).catch(() => {})
  }, [])

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

  // Auto-fetch when account or category changes — reset to page 1
  useEffect(() => {
    if (selectedAccount) {
      setPage(1)
      fetchProjects(1)
    } else {
      setProjects([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount, selectedCategory])

  // Re-fetch when page changes
  useEffect(() => {
    if (selectedAccount) {
      fetchProjects(page)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const openProjectModal = async (project: Project) => {
    const cached = detailCacheRef.current.get(project.external_id)

    if (cached && !isStale(cached.cachedAt)) {
      // Show cached data instantly
      setModalProject(cached.detail)
      setModalProposals(cached.proposals)
      setModalOpen(true)
      setModalLoading(false)
      // Silently refresh in background
      refreshModal(project.external_id)
      return
    }

    // No cache — show skeleton and fetch
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
      // Only update if modal is still open for this project
      setModalProject((current) => {
        if (current?.external_id === externalId) {
          return res.detail
        }
        return current
      })
      setModalProposals((current) => {
        if (modalProject?.external_id === externalId) {
          return res.proposals
        }
        return current
      })
    } catch {
      // Silent fail for background refresh
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Buscar Projetos</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Conta</label>
          <select
            value={selectedAccount}
            onChange={(e) => {
              setSelectedAccount(e.target.value)
              setProjects([])
              setError('')
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione uma conta...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.username}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value)
              setPage(1)
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as categorias</option>
            {Object.entries(categories).map(([slug, name]) => (
              <option key={slug} value={slug}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => fetchProjects(page, true)}
          disabled={loading || !selectedAccount}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Buscando...' : 'Atualizar'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading && <Skeleton />}

      {!loading && projects.length > 0 && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span>{projects.length} projetos encontrados</span>
              {selectedCategory && (
                <span className="ml-1">(categoria: {categories[selectedCategory]})</span>
              )}
              <span className="ml-3 text-gray-400 text-xs">Dados ao vivo do 99freelas</span>
            </div>

            {/* Pagination */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <span className="text-sm font-medium text-gray-700 px-2">Página {page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                Próxima →
              </button>
            </div>
          </div>

          <DataTable
            rows={projects}
            keyExtractor={(p) => p.external_id || p.id}
            onRowClick={openProjectModal}
            columns={[
              {
                key: 'title',
                header: 'Projeto',
                render: (p) => (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.title}</span>
                      {p.is_featured && (
                        <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded uppercase">
                          Destaque
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {p.category}{p.subcategory ? ` › ${p.subcategory}` : ''}
                    </p>
                  </div>
                ),
              },
              {
                key: 'client',
                header: 'Cliente',
                render: (p) => (
                  <div className="flex items-center gap-2">
                    {p.client_avatar && (
                      <img src={p.client_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                    )}
                    <div>
                      <p className="text-sm">{p.client_name || '-'}</p>
                      {p.client_rating != null && (
                        <p className="text-[10px] text-yellow-600">★ {p.client_rating}</p>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: 'experience_level',
                header: 'Nível',
                render: (p) => p.experience_level || '-',
              },
              {
                key: 'proposals',
                header: 'Propostas',
                render: (p) => (
                  <span>
                    {p.proposals_count ?? '-'}
                    {p.interested_count != null && (
                      <span className="text-gray-400 text-xs ml-1">({p.interested_count} interessados)</span>
                    )}
                  </span>
                ),
              },
              {
                key: 'budget',
                header: 'Orçamento',
                render: (p) =>
                  p.budget_min && p.budget_max
                    ? `R$ ${p.budget_min} - R$ ${p.budget_max}`
                    : p.budget_min
                      ? `R$ ${p.budget_min}+`
                      : '-',
              },
              {
                key: 'is_new',
                header: 'Status',
                render: (p) => <StatusBadge status={p.is_new ? 'new' : 'sent'} />,
              },
            ]}
          />
        </>
      )}

      {!loading && projects.length === 0 && selectedAccount && (
        <div className="text-center text-gray-500 py-12">
          Nenhum projeto encontrado.
        </div>
      )}

      {!loading && !selectedAccount && (
        <div className="text-center text-gray-500 py-12">
          Selecione uma conta para buscar projetos do 99freelas
        </div>
      )}

      {/* Project Detail Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalProject?.title || 'Detalhes do Projeto'}
      >
        {modalLoading && <Skeleton />}
        {!modalLoading && modalProject && (
          <div className="space-y-4">
            {/* Project badges */}
            <div className="flex flex-wrap gap-2">
              {modalProject.is_featured && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                  ⭐ Projeto em Destaque
                </span>
              )}
              {modalProject.visibility && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {modalProject.visibility}
                </span>
              )}
              {modalProject.allows_multiple_freelancers && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                  Múltiplos freelancers
                </span>
              )}
              {modalProject.published_at && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  Publicado: {modalProject.published_at}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Categoria:</span>
                <p className="font-medium">{modalProject.category || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Subcategoria:</span>
                <p className="font-medium">{modalProject.subcategory || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Nível:</span>
                <p className="font-medium">{modalProject.experience_level || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Cliente:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  {modalProject.client_avatar && (
                    <img src={modalProject.client_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                  )}
                  <div>
                    <p className="font-medium">{modalProject.client_name || '-'}</p>
                    {modalProject.client_rating != null && (
                      <p className="text-xs text-yellow-600">★ {modalProject.client_rating}</p>
                    )}
                  </div>
                </div>
                {modalProject.client_last_seen && (
                  <p className="text-xs text-gray-400 mt-0.5">{modalProject.client_last_seen}</p>
                )}
              </div>
              <div>
                <span className="text-gray-500">Orçamento:</span>
                <p className="font-medium">
                  {modalProject.budget_min && modalProject.budget_max
                    ? `R$ ${modalProject.budget_min} - R$ ${modalProject.budget_max}`
                    : modalProject.budget_min
                      ? `R$ ${modalProject.budget_min}+`
                      : '-'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Propostas / Interessados:</span>
                <p className="font-medium">
                  {modalProject.proposals_count ?? '-'} / {modalProject.interested_count ?? '-'}
                </p>
              </div>
            </div>

            {modalProject.description && (
              <div>
                <span className="text-gray-500 text-sm">Descrição:</span>
                <p className="text-sm text-gray-800 mt-1 whitespace-pre-line">{modalProject.description}</p>
              </div>
            )}

            {modalProject.skills && modalProject.skills.length > 0 && (
              <div>
                <span className="text-gray-500 text-sm">Habilidades:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {modalProject.skills.map((s) => (
                    <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-gray-800 mb-3">
                Propostas ({modalProposals.length})
              </h3>
              {modalProposals.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhuma proposta encontrada.</p>
              ) : (
                <div className="space-y-3">
                  {modalProposals.map((prop, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-md p-3 text-sm">
                      <div className="flex items-start gap-3">
                        {prop.freelancer_avatar && (
                          <img
                            src={prop.freelancer_avatar}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-gray-800">{prop.freelancer_name}</span>
                            {prop.is_pro && (
                              <span className="px-1 py-0.5 bg-orange-100 text-orange-700 text-[10px] rounded">PRO</span>
                            )}
                            {prop.is_premium && (
                              <span className="px-1 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] rounded">Premium</span>
                            )}
                            {prop.is_identity_verified && (
                              <span className="text-green-600 text-xs" title="Identidade verificada">✓</span>
                            )}
                          </div>
                          {prop.freelancer_nickname && (
                            <p className="text-gray-500 text-xs">@{prop.freelancer_nickname}</p>
                          )}
                          {prop.freelancer_rating != null && (
                            <p className="text-xs text-yellow-600">★ {prop.freelancer_rating}</p>
                          )}

                          {/* Status badges */}
                          {prop.status_badges.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {prop.status_badges.map((badge, bidx) => (
                                <span
                                  key={bidx}
                                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-medium ${
                                    badge === 'Aceita'
                                      ? 'bg-green-100 text-green-700'
                                      : badge === 'Rejeitada'
                                      ? 'bg-red-100 text-red-700'
                                      : badge === 'Promovida'
                                      ? 'bg-purple-100 text-purple-700'
                                      : badge === 'Freelancer novo'
                                      ? 'bg-cyan-100 text-cyan-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {badge}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Offer details */}
                          {(prop.submitted_at || prop.offer_value || prop.final_value || prop.duration_days) && (
                            <div className="mt-1.5 text-xs text-gray-500 space-y-0.5">
                              {prop.submitted_at && <p>Submetido: {prop.submitted_at}</p>}
                              {prop.offer_value != null && <p>Oferta: R$ {prop.offer_value}</p>}
                              {prop.final_value != null && <p>Oferta final: R$ {prop.final_value}</p>}
                              {prop.duration_days != null && <p>Duração: {prop.duration_days} dias</p>}
                            </div>
                          )}

                          {prop.info && <p className="text-gray-600 mt-1 text-xs">{prop.info}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {modalProject.url && (
              <a
                href={modalProject.url}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-blue-600 text-sm hover:underline mt-2"
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
