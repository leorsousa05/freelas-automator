export interface Account {
  id: string
  username: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

export interface Project {
  id: string
  account_id: string
  external_id: string
  title: string
  description: string | null
  budget_min: number | null
  budget_max: number | null
  deadline: string | null
  url: string | null
  category: string | null
  skills: string[]
  scraped_at: string
  is_new: boolean
}

export interface Message {
  id: string
  account_id: string
  sender_name: string | null
  sender_type: string
  content: string | null
  received_at: string | null
  is_read: boolean
}

export interface Proposal {
  id: string
  account_id: string
  project_id: string | null
  external_id: string
  value: number | null
  delivery_time_days: number | null
  message: string | null
  status: string
  sent_at: string | null
}

export interface ScrapingJob {
  id: string
  account_id: string
  job_type: string
  status: string
  started_at: string | null
  finished_at: string | null
  error_message: string | null
  items_scraped: number
}

export interface DashboardStats {
  new_projects: number
  unread_messages: number
  pending_proposals: number
  failed_jobs: number
  total_accounts: number
  active_accounts: number
}
