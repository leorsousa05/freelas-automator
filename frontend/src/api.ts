import type { Account, Project, Message, Conversation, ConversationMessage, Proposal, ProposalItem, ScrapingJob, DashboardStats } from './types'

const API = '/api'

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  accounts: {
    list: () => fetchJSON<Account[]>(`${API}/accounts`),
    create: (data: { username: string; password: string }) => fetchJSON<Account>(`${API}/accounts`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Account>) => fetchJSON<Account>(`${API}/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) => fetchJSON<void>(`${API}/accounts/${id}`, { method: 'DELETE' }),
    sync: (id: string) => fetchJSON<{ status: string }>(`${API}/accounts/${id}/sync`, { method: 'POST' }),
    categories: () => fetchJSON<Record<string, string>>(`${API}/accounts/categories/available`),
    projects: (id: string, category?: string, page?: number) => {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (page && page > 1) params.set('page', String(page))
      const qs = params.toString()
      return fetchJSON<{ account_id: string; category: string | null; page: number; count: number; projects: Project[] }>(
        `${API}/accounts/${id}/projects${qs ? '?' + qs : ''}`
      )
    },
  },
  projects: {
    list: (accountId?: string, category?: string) => {
      const params = new URLSearchParams()
      if (accountId) params.set('account_id', accountId)
      if (category) params.set('category', category)
      const qs = params.toString()
      return fetchJSON<Project[]>(`${API}/projects${qs ? '?' + qs : ''}`)
    },
    scrape: (accountId: string, category?: string, page?: number) => {
      const params = new URLSearchParams()
      params.set('account_id', accountId)
      if (category) params.set('category', category)
      if (page && page > 1) params.set('page', String(page))
      return fetchJSON<{ account_id: string; category: string | null; page: number; count: number; projects: Project[] }>(
        `${API}/projects/scrape?${params.toString()}`,
        { method: 'POST' }
      )
    },
    get: (externalId: string) => fetchJSON<Project>(`${API}/projects/${externalId}`),
    detail: (externalId: string, accountId: string) =>
      fetchJSON<Project>(`${API}/projects/${externalId}/detail?account_id=${accountId}`),
    full: (externalId: string, accountId: string) =>
      fetchJSON<{ detail: Project; proposals: ProposalItem[] }>(
        `${API}/projects/${externalId}/full?account_id=${accountId}`
      ),
    proposals: (externalId: string, accountId: string) =>
      fetchJSON<{ external_id: string; count: number; proposals: ProposalItem[] }>(
        `${API}/projects/${externalId}/proposals?account_id=${accountId}`
      ),
    isStale: (externalId: string) =>
      fetchJSON<{ stale: boolean; minutes_ago: number | null }>(`${API}/projects/${externalId}/is-stale`),
  },
  messages: {
    list: (params?: string) => fetchJSON<Message[]>(`${API}/messages?${params || ''}`),
    markRead: (id: string) => fetchJSON<void>(`${API}/messages/${id}/read`, { method: 'PATCH' }),
  },
  conversations: {
    list: (accountId?: string, unreadOnly?: boolean) => {
      const params = new URLSearchParams()
      if (accountId) params.set('account_id', accountId)
      if (unreadOnly) params.set('unread_only', 'true')
      const qs = params.toString()
      return fetchJSON<Conversation[]>(`${API}/conversations${qs ? '?' + qs : ''}`)
    },
    get: (id: string) => fetchJSON<Conversation>(`${API}/conversations/${id}`),
    messages: (id: string) => fetchJSON<ConversationMessage[]>(`${API}/conversations/${id}/messages`),
    sync: (accountId: string) =>
      fetchJSON<{ account_id: string; synced_count: number; conversations: Conversation[] }>(
        `${API}/conversations/sync?account_id=${accountId}`,
        { method: 'POST' }
      ),
    syncMessages: (id: string) =>
      fetchJSON<{ conversation_id: string; synced_count: number; messages: ConversationMessage[] }>(
        `${API}/conversations/${id}/sync-messages`,
        { method: 'POST' }
      ),
    send: (id: string, text: string) =>
      fetchJSON<{ success: boolean; conversation_id: string; external_id: string; text: string; sent_at: string }>(
        `${API}/conversations/${id}/send`,
        { method: 'POST', body: JSON.stringify({ text }) }
      ),
  },
  proposals: {
    list: (params?: string) => fetchJSON<Proposal[]>(`${API}/proposals?${params || ''}`),
  },
  jobs: {
    list: () => fetchJSON<ScrapingJob[]>(`${API}/jobs`),
  },
  dashboard: {
    stats: () => fetchJSON<DashboardStats>(`${API}/dashboard/stats`),
  },
}
