import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAccountStore } from '../stores/accountStore'
import { api } from '../api'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import { RefreshCw, Trash2, Plug } from 'lucide-react'

const PLATFORMS = [
  { value: '99freelas', label: '99Freelas', color: 'bg-blue-100 text-blue-700' as const },
  { value: 'workana', label: 'Workana', color: 'bg-green-100 text-green-700' as const },
  { value: 'freelancer', label: 'Freelancer.com', color: 'bg-indigo-100 text-indigo-700' as const },
  { value: 'upwork', label: 'Upwork', color: 'bg-emerald-100 text-emerald-700' as const },
  { value: 'other', label: 'Outra', color: 'bg-slate-100 text-slate-700' as const },
]

function platformBadge(platform: string) {
  return PLATFORMS.find((x) => x.value === platform) ?? PLATFORMS[PLATFORMS.length - 1]
}

export default function Accounts() {
  const queryClient = useQueryClient()
  const { accounts } = useAccountStore()

  const [form, setForm] = useState({ platform: '99freelas', username: '', password: '' })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const { isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: ({ signal }) => api.accounts.list(signal),
    staleTime: 5 * 60 * 1000,
  })

  const handleTest = async () => {
    if (!form.username || !form.password) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.accounts.testLogin(form)
      setTestResult(res)
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Erro ao testar login' })
    } finally {
      setTesting(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.accounts.create(form)
    setForm({ platform: '99freelas', username: '', password: '' })
    setTestResult(null)
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover conta?')) return
    await api.accounts.remove(id)
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
  }

  const handleSync = async (id: string) => {
    await api.accounts.sync(id)
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
  }

  if (isLoading && accounts.length === 0) return <Skeleton />

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-6">Contas</h1>

      <Card className="mb-6">
        <form onSubmit={handleCreate} className="space-y-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">Adicionar conta</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Plataforma"
              value={form.platform}
              onChange={(e) => {
                setForm((f) => ({ ...f, platform: e.target.value }))
                setTestResult(null)
              }}
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </Select>
            <Input
              label="Usuário / E-mail"
              value={form.username}
              onChange={(e) => {
                setForm((f) => ({ ...f, username: e.target.value }))
                setTestResult(null)
              }}
              placeholder="seu@email.com"
              required
            />
            <Input
              label="Senha"
              type="password"
              value={form.password}
              onChange={(e) => {
                setForm((f) => ({ ...f, password: e.target.value }))
                setTestResult(null)
              }}
              placeholder="••••••••"
              required
            />
            <div className="flex items-end gap-2">
              <Button type="button" variant="secondary" onClick={handleTest} disabled={testing || !form.username || !form.password} isLoading={testing}>
                <Plug size={16} />
                Testar login
              </Button>
              <Button type="submit">Adicionar</Button>
            </div>
          </div>
          {testResult && (
            <div className={`p-3 rounded-lg text-sm font-medium border ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400'
            }`}>
              {testResult.message}
            </div>
          )}
        </form>
      </Card>

      {accounts && accounts.length > 0 ? (
        <div className="space-y-3">
          {accounts.map((a) => {
            const pb = platformBadge(a.platform)
            return (
              <Card key={a.id} className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Badge variant="neutral">{pb.label}</Badge>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-50">{a.username}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {a.is_active ? 'Ativo' : 'Inativo'}
                      {a.last_login_at && ` • Último login: ${new Date(a.last_login_at).toLocaleString('pt-BR')}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleSync(a.id)}>
                    <RefreshCw size={14} />
                    Sync
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState title="Nenhuma conta cadastrada" />
      )}
    </div>
  )
}
