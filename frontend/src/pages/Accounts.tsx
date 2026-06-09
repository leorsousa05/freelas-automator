import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { useSync } from '../hooks/useSync'
import { api } from '../api'
import DataTable from '../components/DataTable'
import Skeleton from '../components/Skeleton'

export default function Accounts() {
  const { data: accounts, loading, refetch } = useFetch(api.accounts.list)
  const { sync, syncing } = useSync()
  const [form, setForm] = useState({ username: '', password: '' })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.accounts.create(form)
    setForm({ username: '', password: '' })
    refetch()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover conta?')) return
    await api.accounts.remove(id)
    refetch()
  }

  if (loading) return <Skeleton />

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Contas 99freelas</h1>

      <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg shadow-sm mb-6 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Usuário</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            required
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Senha</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 text-sm"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
          />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
          Adicionar
        </button>
      </form>

      {accounts && (
        <DataTable
          rows={accounts}
          keyExtractor={(a) => a.id}
          columns={[
            { key: 'username', header: 'Usuário' },
            { key: 'is_active', header: 'Ativo', render: (a) => (a.is_active ? 'Sim' : 'Não') },
            {
              key: 'actions',
              header: 'Ações',
              render: (a) => (
                <div className="flex gap-2">
                  <button
                    onClick={() => sync(a.id).then(refetch)}
                    disabled={syncing === a.id}
                    className="text-blue-600 text-sm hover:underline disabled:opacity-50"
                  >
                    {syncing === a.id ? 'Syncing...' : '🔃 Sync'}
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="text-red-600 text-sm hover:underline">
                    🗑️
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  )
}
