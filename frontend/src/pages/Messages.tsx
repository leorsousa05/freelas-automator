import { useFetch } from '../hooks/useFetch'
import { api } from '../api'
import DataTable from '../components/DataTable'
import Skeleton from '../components/Skeleton'

export default function Messages() {
  const { data: messages, loading, refetch } = useFetch(api.messages.list)

  const handleMarkRead = async (id: string) => {
    await api.messages.markRead(id)
    refetch()
  }

  if (loading) return <Skeleton />

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mensagens</h1>
      {messages && (
        <DataTable
          rows={messages}
          keyExtractor={(m) => m.id}
          columns={[
            { key: 'sender_name', header: 'Remetente' },
            { key: 'content', header: 'Conteúdo', render: (m) => <span className="line-clamp-2">{m.content}</span> },
            { key: 'received_at', header: 'Data' },
            {
              key: 'is_read',
              header: 'Lida',
              render: (m) => (m.is_read ? '✅' : '🔴'),
            },
            {
              key: 'actions',
              header: '',
              render: (m) =>
                !m.is_read ? (
                  <button onClick={() => handleMarkRead(m.id)} className="text-blue-600 text-sm hover:underline">
                    Marcar lida
                  </button>
                ) : null,
            },
          ]}
        />
      )}
    </div>
  )
}
