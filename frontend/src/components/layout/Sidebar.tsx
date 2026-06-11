import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  MessageSquare,
  Send,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/accounts', label: 'Contas', icon: Users },
  { to: '/projects', label: 'Projetos', icon: FolderOpen },
  { to: '/messages', label: 'Mensagens', icon: MessageSquare },
  { to: '/proposals', label: 'Propostas', icon: Send },
  { to: '/jobs', label: 'Jobs', icon: Settings },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`hidden md:flex flex-col h-screen fixed left-0 top-0 z-50 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800">
        {!collapsed && (
          <span className="font-display font-bold text-lg text-slate-900 dark:text-slate-50">
            FreelaBot
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-auto"
          aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {links.map((l) => {
          const Icon = l.icon
          return (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 border-l-[3px] border-accent-500'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-100 border-l-[3px] border-transparent'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              <Icon size={20} strokeWidth={1.5} />
              {!collapsed && <span>{l.label}</span>}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
