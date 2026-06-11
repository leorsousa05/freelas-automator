import { useAccountStore } from '../../stores/accountStore'
import Select from '../ui/Select'
import Button from '../ui/Button'
import { RefreshCw } from 'lucide-react'

interface ProjectFiltersProps {
  categories: Record<string, string>
  isLoading: boolean
  onRefresh: () => void
}

export default function ProjectFilters({ categories, isLoading, onRefresh }: ProjectFiltersProps) {
  const { accounts, selectedAccountId, selectedCategory, selectAccount, selectCategory } =
    useAccountStore()

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-[200px]">
        <Select
          label="Conta"
          value={selectedAccountId}
          onChange={(e) => selectAccount(e.target.value)}
        >
          <option value="">Selecione uma conta...</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.username}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex-1 min-w-[200px]">
        <Select
          label="Categoria"
          value={selectedCategory}
          onChange={(e) => selectCategory(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {Object.entries(categories).map(([slug, name]) => (
            <option key={slug} value={slug}>
              {name}
            </option>
          ))}
        </Select>
      </div>
      <Button onClick={onRefresh} disabled={isLoading || !selectedAccountId} isLoading={isLoading}>
        <RefreshCw size={16} />
        Atualizar
      </Button>
    </div>
  )
}
