import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAccountStore } from '../stores/accountStore'
import { api } from '../api'

export default function AccountLoader({ children }: { children: React.ReactNode }) {
  const setAccounts = useAccountStore((s) => s.setAccounts)

  const { data } = useQuery({
    queryKey: ['accounts'],
    queryFn: ({ signal }) => api.accounts.list(signal),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (data) setAccounts(data)
  }, [data, setAccounts])

  return <>{children}</>
}
