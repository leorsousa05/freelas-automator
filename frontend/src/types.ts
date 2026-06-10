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
  subcategory: string | null
  skills: string[]
  scraped_at: string
  cached_at: string | null
  is_new: boolean
  experience_level: string | null
  proposals_count: number | null
  interested_count: number | null
  client_name: string | null
  client_avatar: string | null
  client_rating: number | null
  client_last_seen: string | null
  visibility: string | null
  published_at: string | null
  is_featured: boolean
  allows_multiple_freelancers: boolean
}

export interface ProposalItem {
  freelancer_name: string
  freelancer_nickname: string
  freelancer_avatar: string | null
  freelancer_rating: number | null
  is_premium: boolean
  is_pro: boolean
  is_identity_verified: boolean
  status: string
  status_badges: string[]
  submitted_at: string | null
  offer_value: number | null
  final_value: number | null
  duration_days: number | null
  info: string
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

export interface Conversation {
  id: string
  account_id: string
  external_id: string
  client_name: string | null
  client_photo_url: string | null
  client_verified: boolean
  project_id: string | null
  project_name: string | null
  last_message_snippet: string | null
  last_message_at: string | null
  has_files: boolean
  is_deleted: boolean
  is_system: boolean
  is_admin: boolean
  unread: boolean
  scraped_at: string
}

export interface ConversationMessage {
  id: string
  conversation_id: string
  external_id: string
  sender_name: string | null
  sender_photo_url: string | null
  sender_type: string
  content: string | null
  has_files: boolean
  sent_at: string | null
  sent_by_me: boolean
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
