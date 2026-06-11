import type { Account, Project, Message, Conversation, ConversationMessage, Proposal, ProposalItem, ScrapingJob, DashboardStats, SendProposalResponse, SubscriptionStatus } from './types'

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
    list: (signal?: AbortSignal) => fetchJSON<Account[]>(`${API}/accounts`, { signal }),
    create: (data: { platform: string; username: string; password: string }) => fetchJSON<Account>(`${API}/accounts`, { method: 'POST', body: JSON.stringify(data) }),
    testLogin: (data: { platform: string; username: string; password: string }) => fetchJSON<{ success: boolean; message: string }>(`${API}/accounts/test-login`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Account>) => fetchJSON<Account>(`${API}/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) => fetchJSON<void>(`${API}/accounts/${id}`, { method: 'DELETE' }),
    sync: (id: string) => fetchJSON<{ status: string }>(`${API}/accounts/${id}/sync`, { method: 'POST' }),
    categories: (signal?: AbortSignal) => fetchJSON<Record<string, string>>(`${API}/accounts/categories/available`, { signal }),
    subscription: (id: string, signal?: AbortSignal) => fetchJSON<SubscriptionStatus>(`${API}/accounts/${id}/subscription`, { signal }),
    projects: (id: string, category?: string, page?: number, signal?: AbortSignal) => {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (page && page > 1) params.set('page', String(page))
      const qs = params.toString()
      return fetchJSON<{ account_id: string; category: string | null; page: number; count: number; projects: Project[] }>(
        `${API}/accounts/${id}/projects${qs ? '?' + qs : ''}`,
        { signal }
      )
    },
  },
  projects: {
    list: (accountId?: string, category?: string, signal?: AbortSignal) => {
      const params = new URLSearchParams()
      if (accountId) params.set('account_id', accountId)
      if (category) params.set('category', category)
      const qs = params.toString()
      return fetchJSON<Project[]>(`${API}/projects${qs ? '?' + qs : ''}`, { signal })
    },
    scrape: (accountId: string, category?: string, page?: number, signal?: AbortSignal) => {
      const params = new URLSearchParams()
      params.set('account_id', accountId)
      if (category) params.set('category', category)
      if (page && page > 1) params.set('page', String(page))
      return fetchJSON<{ account_id: string; category: string | null; page: number; count: number; projects: Project[] }>(
        `${API}/projects/scrape?${params.toString()}`,
        { method: 'POST', signal }
      )
    },
    get: (externalId: string, signal?: AbortSignal) => fetchJSON<Project>(`${API}/projects/${externalId}`, { signal }),
    detail: (externalId: string, accountId: string, signal?: AbortSignal) =>
      fetchJSON<Project>(`${API}/projects/${externalId}/detail?account_id=${accountId}`, { signal }),
    full: (externalId: string, accountId: string, signal?: AbortSignal) =>
      fetchJSON<{ detail: Project; proposals: ProposalItem[] }>(
        `${API}/projects/${externalId}/full?account_id=${accountId}`,
        { signal }
      ),
    proposals: (externalId: string, accountId: string, signal?: AbortSignal) =>
      fetchJSON<{ external_id: string; count: number; proposals: ProposalItem[] }>(
        `${API}/projects/${externalId}/proposals?account_id=${accountId}`,
        { signal }
      ),
    isStale: (externalId: string, signal?: AbortSignal) =>
      fetchJSON<{ stale: boolean; minutes_ago: number | null }>(`${API}/projects/${externalId}/is-stale`, { signal }),
    sendProposal: (externalId: string, data: { account_id: string; offer_value: string; final_value: string; duration_days: number; details: string }) =>
      fetchJSON<SendProposalResponse>(`${API}/projects/${externalId}/send-proposal`, { method: 'POST', body: JSON.stringify(data) }),
  },
  messages: {
    list: (params?: string, signal?: AbortSignal) => fetchJSON<Message[]>(`${API}/messages?${params || ''}`, { signal }),
    markRead: (id: string) => fetchJSON<void>(`${API}/messages/${id}/read`, { method: 'PATCH' }),
  },
  conversations: {
    list: (accountId?: string, unreadOnly?: boolean, signal?: AbortSignal) => {
      const params = new URLSearchParams()
      if (accountId) params.set('account_id', accountId)
      if (unreadOnly) params.set('unread_only', 'true')
      const qs = params.toString()
      return fetchJSON<Conversation[]>(`${API}/conversations${qs ? '?' + qs : ''}`, { signal })
    },
    get: (id: string, signal?: AbortSignal) => fetchJSON<Conversation>(`${API}/conversations/${id}`, { signal }),
    messages: (id: string, signal?: AbortSignal) => fetchJSON<ConversationMessage[]>(`${API}/conversations/${id}/messages`, { signal }),
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
    list: (params?: string, signal?: AbortSignal) => fetchJSON<Proposal[]>(`${API}/proposals?${params || ''}`, { signal }),
  },
  jobs: {
    list: (signal?: AbortSignal) => fetchJSON<ScrapingJob[]>(`${API}/jobs`, { signal }),
  },
  dashboard: {
    stats: (signal?: AbortSignal) => fetchJSON<DashboardStats>(`${API}/dashboard/stats`, { signal }),
  },
}
