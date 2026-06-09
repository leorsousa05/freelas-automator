const styles: Record<string, string> = {
  success: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  running: 'bg-blue-100 text-blue-800',
  pending: 'bg-gray-100 text-gray-800',
  new: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-gray-100 text-gray-800',
  viewed: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

export default function StatusBadge({ status }: { status: string }) {
  const cls = styles[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}
