import { useState, useEffect, useCallback } from 'react'
import { useFetch } from '../hooks/useFetch'
import { api } from '../api'
import Card from '../components/ui/Card'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Textarea from '../components/ui/Textarea'
import type { Conversation, ConversationMessage } from '../types'
import { RefreshCw, ArrowLeft, Send } from 'lucide-react'

function formatDate(d: string | null) {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function ConversationItem({
  conv,
  selected,
  onClick,
}: {
  conv: Conversation
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-800 transition-colors ${
        selected
          ? 'bg-accent-50 dark:bg-accent-900/20 border-l-[3px] border-l-accent-500'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-[3px] border-l-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        <Avatar src={conv.client_photo_url} name={conv.client_name} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-50 truncate">
              {conv.client_name || 'Desconhecido'}
              {conv.client_verified && (
                <Badge variant="success" className="ml-1 text-[10px] px-1 py-0">
                  Verificado
                </Badge>
              )}
            </span>
            {conv.unread && <span className="w-2 h-2 rounded-full bg-accent-500 shrink-0" />}
          </div>
          {conv.project_name && (
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{conv.project_name}</div>
          )}
          <div className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
            {conv.last_message_snippet}
          </div>
        </div>
      </div>
      <div className="text-right text-[10px] text-slate-400 dark:text-slate-500 mt-1">
        {formatDate(conv.last_message_at)}
      </div>
    </button>
  )
}

function MessageBubble({ msg }: { msg: ConversationMessage }) {
  const isMe = msg.sent_by_me
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
          isMe
            ? 'bg-accent-500 text-white rounded-br-md'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-md'
        }`}
      >
        <div className={`text-xs mb-1 ${isMe ? 'text-accent-100' : 'text-slate-500 dark:text-slate-400'}`}>
          {msg.sender_name || 'Desconhecido'}
        </div>
        <div className="whitespace-pre-wrap">{msg.content}</div>
        <div className={`text-[10px] mt-1 ${isMe ? 'text-accent-200' : 'text-slate-400 dark:text-slate-500'}`}>
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
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')

  const {
    data: conversations,
    loading: convLoading,
    error: convError,
    refetch: refetchConversations,
  } = useFetch(useCallback(() => api.conversations.list(), []))

  const selectedConv = conversations?.find((c) => c.id === selectedId) || null

  const {
    data: messages,
    loading: msgLoading,
    error: msgError,
    refetch: refetchMessages,
  } = useFetch(
    useCallback(() => (selectedId ? api.conversations.messages(selectedId) : Promise.resolve([])), [selectedId])
  )

  useEffect(() => {
    const interval = setInterval(() => {
      handleSync(false)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

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

  const handleSelectConversation = (id: string) => {
    setSelectedId(id)
    setMobileView('chat')
  }

  const handleBackToList = () => {
    setMobileView('list')
    setSelectedId(null)
  }

  if (convLoading) return <Skeleton />

  return (
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Conversas</h1>
          {lastSync && (
            <div className="text-xs text-slate-400 dark:text-slate-500">
              Última sincronização: {lastSync.toLocaleTimeString('pt-BR')}
            </div>
          )}
        </div>
        <Button onClick={() => handleSync(true)} disabled={syncing} isLoading={syncing} size="sm">
          <RefreshCw size={14} />
          Sincronizar
        </Button>
      </div>

      {convError && <div className="text-rose-500 mb-4">Erro: {convError}</div>}

      <Card padding="none" className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Conversation list */}
        <div
          className={`w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 overflow-y-auto ${
            mobileView === 'chat' ? 'hidden md:block' : 'block'
          }`}
        >
          {conversations && conversations.length > 0 ? (
            conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                selected={conv.id === selectedId}
                onClick={() => handleSelectConversation(conv.id)}
              />
            ))
          ) : (
            <EmptyState
              title="Nenhuma conversa encontrada"
              action={
                <Button variant="secondary" size="sm" onClick={() => handleSync(true)}>
                  Sincronizar agora
                </Button>
              }
            />
          )}
        </div>

        {/* Messages */}
        <div
          className={`flex-1 flex flex-col min-w-0 ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}
        >
          {selectedConv ? (
            <>
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBackToList}
                    className="md:hidden p-1 -ml-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div>
                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-50">
                      {selectedConv.client_name || 'Desconhecido'}
                    </div>
                    {selectedConv.project_name && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">{selectedConv.project_name}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lastMsgSync && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                      Atualizado {lastMsgSync.toLocaleTimeString('pt-BR')}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSyncMessages(true)}
                    disabled={syncingMessages}
                    isLoading={syncingMessages}
                  >
                    <RefreshCw size={14} />
                    <span className="hidden sm:inline">Atualizar</span>
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {msgLoading ? (
                  <Skeleton />
                ) : msgError ? (
                  <div className="text-rose-500 text-sm">Erro: {msgError}</div>
                ) : messages && messages.length > 0 ? (
                  messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
                ) : (
                  <EmptyState title="Nenhuma mensagem" />
                )}
              </div>

              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
                {sendError && <div className="text-rose-500 text-xs mb-2">{sendError}</div>}
                <div className="flex gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escreva sua mensagem..."
                    rows={2}
                    disabled={sending}
                    className="flex-1 resize-none"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={sending || !draft.trim()}
                    isLoading={sending}
                    className="self-end"
                  >
                    <Send size={16} />
                  </Button>
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Enter para enviar, Shift+Enter para nova linha
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
              Selecione uma conversa para ver as mensagens
            </div>
          )}
        </div>

        {/* Details - desktop only */}
        <div className="w-64 border-l border-slate-200 dark:border-slate-700 p-4 hidden lg:block overflow-y-auto">
          {selectedConv ? (
            <div>
              <div className="w-16 h-16 mx-auto mb-3">
                <Avatar src={selectedConv.client_photo_url} name={selectedConv.client_name} size="lg" className="w-16 h-16 text-xl" />
              </div>
              <div className="text-center font-semibold text-sm text-slate-900 dark:text-slate-50 mb-1">
                {selectedConv.client_name || 'Desconhecido'}
              </div>
              {selectedConv.client_verified && (
                <div className="text-center text-xs text-accent-500 mb-3">Identidade verificada</div>
              )}
              {selectedConv.project_name && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Projeto</div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {selectedConv.project_name}
                  </div>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</div>
                <div className="text-sm">
                  {selectedConv.unread ? (
                    <Badge variant="error">Não lida</Badge>
                  ) : (
                    <Badge variant="success">Lida</Badge>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400 dark:text-slate-500 text-sm mt-8">
              Detalhes da conversa
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
