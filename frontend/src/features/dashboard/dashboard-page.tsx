import { useState } from 'react'
import { Group, SegmentedControl, Stack } from '@mantine/core'
import { PageHeader } from '@/components/ui/page-header'
import { screenIcons } from '@/lib/app-icons'
import { useAuth } from '@/app/auth-context' // Ajuste o caminho se necessário

// Importe os dois novos componentes que criamos
import { OperationalPanel } from './OperationalPanel'
import { FinancePanel } from './FinancePanel'

export function DashboardPage() {
  const { user } = useAuth()
  const isGestor = (user as any)?.is_superuser
  const [visao, setVisao] = useState<'operacional' | 'financeiro'>('operacional')

  return (
    <Stack gap={20}>
      <Group justify="space-between" align="center">
        <PageHeader
          className="flex-1 max-w-[70%]"
          description={visao === 'operacional' 
            ? "Leia a operacao por excecao: veja alertas, movimentacoes recentes e o estado atual."
            : "Visão executiva de custos, investimentos em ativos e depreciação patrimonial."}
          icon={<screenIcons.dashboard size={18} />}
          title={visao === 'operacional' ? "Dashboard premium" : "Inteligência Financeira"}
        />

        {/* SWITCH DE VISÃO - Só aparece se for Superusuário */}
        {isGestor && (
          <SegmentedControl
            value={visao}
            onChange={(val) => setVisao(val as 'operacional' | 'financeiro')}
            data={[
              { label: 'Operação', value: 'operacional' },
              { label: 'Financeiro', value: 'financeiro' },
            ]}
            color="brand"
            radius="xl"
            size="sm"
          />
        )}
      </Group>

      {/* Renderiza o arquivo isolado correspondente à aba selecionada */}
      {visao === 'operacional' ? <OperationalPanel /> : <FinancePanel />}
    </Stack>
  )
}