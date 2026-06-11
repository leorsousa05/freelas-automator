import Badge from './ui/Badge'

const statusMap: Record<string, { variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
  success: { variant: 'success' },
  failed: { variant: 'error' },
  running: { variant: 'info' },
  pending: { variant: 'neutral' },
  new: { variant: 'warning' },
  sent: { variant: 'neutral' },
  viewed: { variant: 'info' },
  accepted: { variant: 'success' },
  rejected: { variant: 'error' },
}

export default function StatusBadge({ status }: { status: string }) {
  const mapped = statusMap[status.toLowerCase()]
  return <Badge variant={mapped?.variant ?? 'neutral'}>{status}</Badge>
}
