import type { Account, Project, Message, Proposal, ScrapingJob, DashboardStats } from './types'

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
  },
  projects: {
    list: (params?: string) => fetchJSON<Project[]>(`${API}/projects?${params || ''}`),
  },
  messages: {
    list: (params?: string) => fetchJSON<Message[]>(`${API}/messages?${params || ''}`),
    markRead: (id: string) => fetchJSON<void>(`${API}/messages/${id}/read`, { method: 'PATCH' }),
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
