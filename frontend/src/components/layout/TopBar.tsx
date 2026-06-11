import { Sun, Moon, Bell } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

export default function TopBar() {
  const { resolvedTheme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 z-50 flex items-center justify-between px-4 md:px-6 lg:px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="flex items-center gap-3">
        <span className="font-display font-bold text-lg text-slate-900 dark:text-slate-50">FreelaBot</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          aria-label="Alternar tema"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          aria-label="Notificações"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Bell size={18} />
        </button>
        <div className="w-8 h-8 rounded-full bg-accent-100 dark:bg-accent-900 flex items-center justify-center text-xs font-semibold text-accent-600 dark:text-accent-300 ml-1">
          FB
        </div>
      </div>
    </header>
  )
}
