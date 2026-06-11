import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  MessageSquare,
  Send,
  Settings,
} from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/accounts', label: 'Contas', icon: Users },
  { to: '/projects', label: 'Projetos', icon: FolderOpen },
  { to: '/messages', label: 'Mensagens', icon: MessageSquare },
  { to: '/proposals', label: 'Propostas', icon: Send },
  { to: '/jobs', label: 'Jobs', icon: Settings },
]

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-t border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-around h-14">
        {links.map((l) => {
          const Icon = l.icon
          return (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-lg text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'text-accent-600 dark:text-accent-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`
              }
            >
              <Icon size={20} strokeWidth={1.5} />
              <span>{l.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
