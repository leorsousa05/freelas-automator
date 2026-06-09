import { useState, useCallback } from 'react'
import { api } from '../api'

export function useSync() {
  const [syncing, setSyncing] = useState<string | null>(null)

  const sync = useCallback(async (accountId: string) => {
    setSyncing(accountId)
    try {
      await api.accounts.sync(accountId)
    } finally {
      setSyncing(null)
    }
  }, [])

  return { sync, syncing }
}
