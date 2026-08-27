import { SimpleGrid, Stack, Text, ThemeIcon, Group } from '@mantine/core'
import { LoadingPanel } from '@/components/feedback/loading-panel'
import { AppCard } from '@/components/ui/app-card'
import { useAsyncData } from '@/hooks/use-async-data'
import { apiFetch } from '@/lib/api'
import { screenIcons } from '@/lib/app-icons'

type FinanceSummary = {
  total_investido: string
  total_atual: string
  total_depreciado: string
  top_centros: { nome: string, valor: string }[]
}

export function FinancePanel() {
  const { data: financeData, isLoading } = useAsyncData(() => apiFetch<FinanceSummary>('/api/dashboard/finance/'))
  
  const panelCardClassName = 'overflow-hidden border-slate-200/72 bg-white/95 p-0 shadow-[0_12px_34px_rgba(15,23,42,0.04)]'
  const panelHeaderClassName = 'border-b border-slate-100/90 px-3.5 py-3 md:px-4.5'
  const DashboardIcon = screenIcons.dashboard

  const formatarDinheiro = (valor: string | number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor))

  if (isLoading) return <LoadingPanel label="Processando cálculos contábeis..." />

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <AppCard className="border-t-4 border-t-blue-500 shadow-sm">
          <Stack gap={2}>
            <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '1px' }}>Total Investido (Histórico)</Text>
            <Text size="xl" fw={800} c="blue.7">{formatarDinheiro(financeData?.total_investido || 0)}</Text>
            <Text size="xs" c="dimmed">Soma do valor de aquisição de todos os ativos.</Text>
          </Stack>
        </AppCard>

        <AppCard className="border-t-4 border-t-green-500 shadow-sm">
          <Stack gap={2}>
            <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '1px' }}>Patrimônio Líquido (Atual)</Text>
            <Text size="xl" fw={800} c="green.7">{formatarDinheiro(financeData?.total_atual || 0)}</Text>
            <Text size="xs" c="dimmed">Valor real da infraestrutura descontando o uso.</Text>
          </Stack>
        </AppCard>

        <AppCard className="border-t-4 border-t-red-500 bg-red-50/50 shadow-sm">
          <Stack gap={2}>
            <Text size="xs" c="red.7" fw={700} tt="uppercase" style={{ letterSpacing: '1px' }}>Desvalorização Acumulada</Text>
            <Text size="xl" fw={800} c="red.7">- {formatarDinheiro(financeData?.total_depreciado || 0)}</Text>
            <Text size="xs" c="dimmed">Perda de valor contábil pelo tempo de vida dos bens.</Text>
          </Stack>
        </AppCard>
      </SimpleGrid>

      <AppCard className={panelCardClassName}>
        <Stack gap={0}>
          <Group className={panelHeaderClassName} gap="sm" wrap="nowrap">
            <ThemeIcon className="border border-slate-200/85 bg-slate-50/92 text-slate-700 shadow-none" radius="xl" size={32} variant="transparent">
              <DashboardIcon size={16} />
            </ThemeIcon>
            <Stack gap={1}>
              <Text fw={800} size="md">Maiores Investimentos por Centro de Custo</Text>
              <Text size="xs" c="dimmed">Distribuição do orçamento de infraestrutura pelas áreas da empresa.</Text>
            </Stack>
          </Group>

          <div className="px-4 py-4">
            <Stack gap="md">
              {financeData?.top_centros?.map((centro, index) => (
                <Group key={index} justify="space-between" className="border-b border-slate-100 pb-3 last:border-0">
                  <Group gap="sm">
                    <ThemeIcon radius="xl" size={28} variant="light" color="gray">
                      <Text size="xs" fw={700}>{index + 1}º</Text>
                    </ThemeIcon>
                    <Text fw={600} size="sm">{centro.nome}</Text>
                  </Group>
                  <Text fw={800} size="sm">{formatarDinheiro(centro.valor)}</Text>
                </Group>
              ))}
              {(!financeData?.top_centros || financeData.top_centros.length === 0) && (
                <Text c="dimmed" ta="center" py="lg">Nenhum dado financeiro vinculado a centros de custo.</Text>
              )}
            </Stack>
          </div>
        </Stack>
      </AppCard>
    </Stack>
  )
}