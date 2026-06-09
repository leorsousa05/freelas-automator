import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: '📊 Dashboard' },
  { to: '/accounts', label: '👤 Contas' },
  { to: '/projects', label: '📁 Projetos' },
  { to: '/messages', label: '💬 Mensagens' },
  { to: '/proposals', label: '📝 Propostas' },
  { to: '/jobs', label: '⚙️ Jobs' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-gray-800 text-white flex flex-col p-4 shrink-0">
      <div className="text-xl font-bold mb-6">🚀 FreelaBot</div>
      <nav className="flex flex-col gap-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm transition-colors ${
                isActive ? 'bg-gray-700 font-medium' : 'hover:bg-gray-700 opacity-80'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
