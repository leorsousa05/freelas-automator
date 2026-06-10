import { useState, useEffect, useCallback } from 'react'
import { useFetch } from '../hooks/useFetch'
import { api } from '../api'
import Skeleton from '../components/Skeleton'
import type { Conversation, ConversationMessage } from '../types'

function formatDate(d: string | null) {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function ConversationItem({ conv, selected, onClick }: { conv: Conversation; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        selected ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold shrink-0 overflow-hidden">
          {conv.client_photo_url ? (
            <img src={conv.client_photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            (conv.client_name?.[0] || '?').toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm truncate">
              {conv.client_name || 'Desconhecido'}
              {conv.client_verified && <span className="ml-1 text-blue-500 text-xs">✓</span>}
            </span>
            {conv.unread && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
          </div>
          {conv.project_name && (
            <div className="text-xs text-gray-500 truncate">{conv.project_name}</div>
          )}
          <div className="text-xs text-gray-400 truncate mt-0.5">{conv.last_message_snippet}</div>
        </div>
      </div>
      <div className="text-right text-[10px] text-gray-400 mt-1">{formatDate(conv.last_message_at)}</div>
    </button>
  )
}

function MessageBubble({ msg }: { msg: ConversationMessage }) {
  const isMe = msg.sent_by_me
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
        isMe ? 'bg-blue-500 text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'
      }`}>
        <div className="text-xs opacity-70 mb-1">{msg.sender_name || 'Desconhecido'}</div>
        <div className="whitespace-pre-wrap">{msg.content}</div>
        <div className={`text-[10px] mt-1 ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
          {formatDate(msg.sent_at)}
        </div>
      </div>
    </div>
  )
}

export default function Messages() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncingMessages, setSyncingMessages] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [lastMsgSync, setLastMsgSync] = useState<Date | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const { data: conversations, loading: convLoading, error: convError, refetch: refetchConversations } = useFetch(
    useCallback(() => api.conversations.list(), [])
  )

  const selectedConv = conversations?.find((c) => c.id === selectedId) || null

  const { data: messages, loading: msgLoading, error: msgError, refetch: refetchMessages } = useFetch(
    useCallback(() => (selectedId ? api.conversations.messages(selectedId) : Promise.resolve([])), [selectedId])
  )

  // Auto-sync conversations every 30s when on this page
  useEffect(() => {
    const interval = setInterval(() => {
      handleSync(false)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Auto-sync messages every 15s when a conversation is selected
  useEffect(() => {
    if (!selectedId) return
    const interval = setInterval(() => {
      handleSyncMessages(false)
    }, 15000)
    return () => clearInterval(interval)
  }, [selectedId])

  const handleSync = async (manual = true) => {
    if (manual) setSyncing(true)
    try {
      await api.conversations.sync('9d1a99e3-8e59-494a-a220-f12265dd2e69')
      await refetchConversations()
      setLastSync(new Date())
    } catch (e: any) {
      if (manual) alert('Erro ao sincronizar: ' + e.message)
    } finally {
      if (manual) setSyncing(false)
    }
  }

  const handleSyncMessages = async (manual = true) => {
    if (!selectedId) return
    if (manual) setSyncingMessages(true)
    try {
      await api.conversations.syncMessages(selectedId)
      await refetchMessages()
      setLastMsgSync(new Date())
    } catch (e: any) {
      if (manual) alert('Erro ao sincronizar mensagens: ' + e.message)
    } finally {
      if (manual) setSyncingMessages(false)
    }
  }

  const handleSend = async () => {
    if (!selectedId || !draft.trim()) return
    setSending(true)
    setSendError(null)
    try {
      await api.conversations.send(selectedId, draft.trim())
      setDraft('')
      await refetchMessages()
      setLastMsgSync(new Date())
    } catch (e: any) {
      setSendError(e.message || 'Erro ao enviar')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (convLoading) return <Skeleton />

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Conversas</h1>
          {lastSync && (
            <div className="text-xs text-gray-400">
              Última sincronização: {lastSync.toLocaleTimeString('pt-BR')}
            </div>
          )}
        </div>
        <button
          onClick={() => handleSync(true)}
          disabled={syncing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </div>

      {convError && <div className="text-red-600 mb-4">Erro: {convError}</div>}

      <div className="flex-1 flex border border-gray-200 rounded-xl overflow-hidden bg-white">
        {/* Column 1: Conversation list */}
        <div className="w-80 border-r border-gray-200 overflow-y-auto">
          {conversations && conversations.length > 0 ? (
            conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                selected={conv.id === selectedId}
                onClick={() => setSelectedId(conv.id)}
              />
            ))
          ) : (
            <div className="p-8 text-center text-gray-400 text-sm">
              Nenhuma conversa encontrada
              <div className="mt-2">
                <button
                  onClick={() => handleSync(true)}
                  className="text-blue-600 text-xs hover:underline"
                >
                  Sincronizar agora
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Column 2: Messages */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedConv ? (
            <>
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">{selectedConv.client_name || 'Desconhecido'}</div>
                  {selectedConv.project_name && (
                    <div className="text-xs text-gray-500">{selectedConv.project_name}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {lastMsgSync && (
                    <span className="text-[10px] text-gray-400">
                      Atualizado {lastMsgSync.toLocaleTimeString('pt-BR')}
                    </span>
                  )}
                  <button
                    onClick={() => handleSyncMessages(true)}
                    disabled={syncingMessages}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 text-xs"
                  >
                    {syncingMessages ? 'Atualizando...' : 'Atualizar'}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {msgLoading ? (
                  <Skeleton />
                ) : msgError ? (
                  <div className="text-red-600 text-sm">Erro: {msgError}</div>
                ) : messages && messages.length > 0 ? (
                  messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
                ) : (
                  <div className="text-center text-gray-400 text-sm mt-8">Nenhuma mensagem</div>
                )}
              </div>

              {/* Composer */}
              <div className="px-4 py-3 border-t border-gray-200">
                {sendError && (
                  <div className="text-red-600 text-xs mb-2">{sendError}</div>
                )}
                <div className="flex gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escreva sua mensagem..."
                    rows={2}
                    disabled={sending}
                    className="flex-1 resize-none px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !draft.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm self-end"
                  >
                    {sending ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
                <div className="text-[10px] text-gray-400 mt-1">Enter para enviar, Shift+Enter para nova linha</div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Selecione uma conversa para ver as mensagens
            </div>
          )}
        </div>

        {/* Column 3: Details */}
        <div className="w-64 border-l border-gray-200 p-4 hidden lg:block">
          {selectedConv ? (
            <div>
              <div className="w-16 h-16 rounded-full bg-gray-200 mx-auto flex items-center justify-center text-xl font-bold text-gray-500 mb-3 overflow-hidden">
                {selectedConv.client_photo_url ? (
                  <img src={selectedConv.client_photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (selectedConv.client_name?.[0] || '?').toUpperCase()
                )}
              </div>
              <div className="text-center font-semibold text-sm mb-1">
                {selectedConv.client_name || 'Desconhecido'}
              </div>
              {selectedConv.client_verified && (
                <div className="text-center text-xs text-blue-500 mb-3">Identidade verificada ✓</div>
              )}
              {selectedConv.project_name && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">Projeto</div>
                  <div className="text-sm font-medium">{selectedConv.project_name}</div>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-500 mb-1">Status</div>
                <div className="text-sm">
                  {selectedConv.unread ? (
                    <span className="text-red-500 font-medium">Não lida</span>
                  ) : (
                    <span className="text-green-600">Lida</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 text-sm mt-8">Detalhes da conversa</div>
          )}
        </div>
      </div>
    </div>
  )
}
