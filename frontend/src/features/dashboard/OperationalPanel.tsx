import { Group, SimpleGrid, Stack, Table, Text, ThemeIcon } from '@mantine/core'

import { LoadingPanel } from '@/components/feedback/loading-panel'
import { AppCard } from '@/components/ui/app-card'
import { AppButton } from '@/components/ui/app-button'
import { DataTable } from '@/components/ui/data-table'
import { MetricCard } from '@/components/ui/metric-card'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAsyncData } from '@/hooks/use-async-data'
import { apiFetch } from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/format'
import { screenIcons, sectionIcons } from '@/lib/app-icons'
import type { DashboardData, Equipment } from '@/types/domain'


export function OperationalPanel() {
  const { data, error, isLoading, reload } = useAsyncData(() => apiFetch<DashboardData>('/api/dashboard/'))
  const panelCardClassName = 'overflow-hidden border-slate-200/72 bg-white/95 p-0 shadow-[0_12px_34px_rgba(15,23,42,0.04)]'
  const panelHeaderClassName = 'border-b border-slate-100/90 px-3.5 py-3 md:px-4.5'
  const DashboardIcon = screenIcons.dashboard
  const EquipmentIcon = screenIcons.equipments
  const CollaboratorIcon = screenIcons.collaborators
  const ConsumableIcon = screenIcons.consumables
  const ActiveIcon = sectionIcons.active
  const InUseIcon = sectionIcons.clock
  const AvailableIcon = sectionIcons.available
  const MaintenanceIcon = sectionIcons.maintenance
  const AlertIcon = sectionIcons.alerts
  const TimelineIcon = sectionIcons.timeline
  const SummaryIcon = sectionIcons.summary

  if (isLoading) {
    return <LoadingPanel label="Montando o painel executivo..." />
  }

  if (!data) {
    return (
      <AppCard>
        <Stack gap="md">
          <Text fw={700}>Nao foi possivel carregar o dashboard.</Text>
          <Text c="dimmed">{error}</Text>
          <AppButton onClick={() => void reload()} w="fit-content">
            Tentar novamente
          </AppButton>
        </Stack>
      </AppCard>
    )
  }

  const metrics = [
    {
      title: 'Equipamentos ativos',
      value: data.totais.equipamentos,
      description: 'Patrimonio atualmente disponivel no ambiente operacional.',
      icon: <ActiveIcon size={18} />,
    },
    {
      title: 'Em uso',
      value: data.totais.equipamentos_em_uso,
      description: 'Ativos vinculados aos colaboradores no momento.',
      icon: <InUseIcon size={18} />,
    },
    {
      title: 'Disponiveis',
      value: data.totais.equipamentos_disponiveis,
      description: 'Itens prontos para distribuicao imediata.',
      icon: <AvailableIcon size={18} />,
    },
    {
      title: 'Manutencao',
      value: data.totais.equipamentos_manutencao,
      description: 'Equipamentos que exigem tratamento tecnico.',
      icon: <MaintenanceIcon size={18} />,
    },
    {
      title: 'Colaboradores ativos',
      value: data.totais.colaboradores_ativos,
      description: 'Base atual de colaboradores com acesso operacional.',
      icon: <CollaboratorIcon size={18} />,
    },
    {
      title: 'Consumiveis monitorados',
      value: data.totais.consumiveis,
      description: 'Itens do almoxarifado com saldo e ponto minimo.',
      icon: <ConsumableIcon size={18} />,
    },
  ]

  return (
    <Stack gap={20}>
      <PageHeader
        actions={
          <AppButton className="h-9 border border-brand-100/80 bg-white/88 px-3.5 text-[0.88rem] text-slate-900 shadow-none hover:bg-white" onClick={() => void reload()} variant="light">
            Atualizar painel
          </AppButton>
        }
        className="items-start gap-3 rounded-[24px] border border-white/80 bg-white/72 px-4 py-3.5 shadow-[0_14px_36px_rgba(15,23,42,0.04)] backdrop-blur-sm md:px-4.5"
        description="Leia a operacao por excecao: veja alertas, movimentacoes recentes e o estado atual do inventario sem excesso visual."
        icon={<DashboardIcon size={18} />}
        title="Dashboard premium"
      />

      <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="xs">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </SimpleGrid>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)]">
        <AppCard className={panelCardClassName}>
          <Stack gap={0}>
            <Group className={panelHeaderClassName} justify="space-between">
              <Group align="flex-start" className="gap-3" wrap="nowrap">
                <ThemeIcon className="border border-slate-200/85 bg-slate-50/92 text-slate-700 shadow-none" radius="xl" size={32} variant="transparent">
                  <AlertIcon size={16} />
                </ThemeIcon>
                <Stack gap={1}>
                  <Text fw={800} size="md">
                    Alertas de estoque
                  </Text>
                  <Text c="dimmed" size="sm">
                    Consumiveis abaixo do ponto minimo exigem acao.
                  </Text>
                </Stack>
              </Group>
              <StatusBadge label={`${data.alertas_estoque.length} alertas`} value="saida" />
            </Group>

            <div className="px-2 pb-2 pt-1">
              <Table.ScrollContainer minWidth={520}>
                <Table horizontalSpacing="md" verticalSpacing={8}>
                  <Table.Thead>
                    <Table.Tr className="border-y border-slate-100/90 bg-slate-50/75">
                      <Table.Th className="py-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Item</Table.Th>
                      <Table.Th className="py-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Saldo atual</Table.Th>
                      <Table.Th className="py-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Minimo</Table.Th>
                      <Table.Th className="py-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Status</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.alertas_estoque.map((item) => (
                      <Table.Tr key={item.id} className="border-b border-slate-100/80 transition-colors last:border-none hover:bg-slate-50/60">
                        <Table.Td className="py-2.5">
                          <Text fw={700} size="sm">
                            {item.nome}
                          </Text>
                        </Table.Td>
                        <Table.Td className="py-2.5">
                          <Text size="sm">{item.quantidade_atual}</Text>
                        </Table.Td>
                        <Table.Td className="py-2.5">
                          <Text size="sm">{item.estoque_minimo}</Text>
                        </Table.Td>
                        <Table.Td className="py-2.5">
                          <StatusBadge label="Reposicao sugerida" value="saida" />
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </div>
          </Stack>
        </AppCard>

        <AppCard className={panelCardClassName}>
          <Stack gap={0}>
            <Group className={panelHeaderClassName} justify="space-between">
              <Group align="flex-start" className="gap-3" wrap="nowrap">
                <ThemeIcon className="border border-slate-200/85 bg-slate-50/92 text-slate-700 shadow-none" radius="xl" size={32} variant="transparent">
                  <TimelineIcon size={16} />
                </ThemeIcon>
                <Stack gap={1}>
                  <Text fw={800} size="md">
                    Ritmo da operacao
                  </Text>
                  <Text c="dimmed" size="sm">
                    Ultimas movimentacoes relevantes do almoxarifado.
                  </Text>
                </Stack>
              </Group>
              <StatusBadge label="Auditoria ativa" value="entrada" />
            </Group>

            <Stack className="px-3 py-3 md:px-3.5 md:py-3.5" gap="xs">
              {data.movimentacoes_recentes.map((item) => (
                <Group
                  key={item.id}
                  align="flex-start"
                  className="rounded-[18px] border border-slate-100/90 bg-slate-50/78 px-3 py-2.5"
                  justify="space-between"
                  wrap="wrap"
                >
                  <Stack gap={2}>
                    <Text fw={700} size="sm">
                      {item.consumivel_nome}
                    </Text>
                    <Text c="dimmed" size="sm">
                      {item.responsavel?.nome ?? 'Sem responsavel'} · {item.destino || 'Destino interno'}
                    </Text>
                  </Stack>
                  <Stack align="flex-end" gap={2}>
                    <StatusBadge label={item.tipo_label} value={item.tipo} />
                    <Text fw={700} size="sm">
                      {item.quantidade} un.
                    </Text>
                    <Text c="dimmed" size="xs">
                      {formatDateTime(item.data)}
                    </Text>
                  </Stack>
                </Group>
              ))}
            </Stack>
          </Stack>
        </AppCard>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <AppCard className={panelCardClassName}>
          <Stack gap={0}>
            <Group className={panelHeaderClassName} gap="sm" wrap="nowrap">
              <ThemeIcon className="border border-slate-200/85 bg-slate-50/92 text-slate-700 shadow-none" radius="xl" size={32} variant="transparent">
                <EquipmentIcon size={16} />
              </ThemeIcon>
              <Text fw={800} size="md">
                Equipamentos recentes
              </Text>
            </Group>
            <div className="px-2 pb-2 pt-1">
              <DataTable<Equipment>
                columns={[
                  {
                    key: 'nome',
                    label: 'Equipamento',
                    render: (item) => (
                      <Stack gap={0}>
                        <Text fw={700}>{item.nome}</Text>
                        <Text c="dimmed" size="xs">
                          {item.categoria?.nome ?? 'Sem categoria'} · {item.num_patrimonio}
                        </Text>
                      </Stack>
                    ),
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    width: 140,
                    render: (item) => <StatusBadge label={item.status_label} value={item.status} />,
                  },
                  {
                    key: 'responsavel',
                    label: 'Responsavel',
                    render: (item) => item.responsavel?.nome ?? 'Estoque interno',
                  },
                  {
                    key: 'data',
                    label: 'Registro',
                    width: 120,
                    render: (item) => formatDate(item.data),
                  },
                ]}
                emptyDescription="Os equipamentos novos aparecerao aqui assim que forem cadastrados."
                emptyIcon={<EquipmentIcon size={18} />}
                emptyTitle="Sem equipamentos recentes"
                items={data.equipamentos_recentes}
                keyExtractor={(item) => item.id}
                minWidth={720}
              />
            </div>
          </Stack>
        </AppCard>

        <AppCard className={panelCardClassName}>
          <Stack gap={0}>
            <Group className={panelHeaderClassName} gap="sm" wrap="nowrap">
              <ThemeIcon className="border border-slate-200/85 bg-slate-50/92 text-slate-700 shadow-none" radius="xl" size={32} variant="transparent">
                <SummaryIcon size={16} />
              </ThemeIcon>
              <Text fw={800} size="md">
                Resumo executivo
              </Text>
            </Group>
            <Stack className="px-3 py-3 md:px-3.5 md:py-3.5" gap="sm">
              <Group className="rounded-[18px] border border-brand-100/80 bg-brand-0/58 px-3 py-3" justify="space-between" wrap="nowrap">
                <Stack gap={2}>
                  <Text c="dimmed" fw={600} size="sm">
                    Cobertura de pessoas
                  </Text>
                  <Text fw={800} size="lg">
                    {data.totais.colaboradores_ativos} colaboradores ativos
                  </Text>
                </Stack>
                <ThemeIcon className="border border-brand-100/90 bg-white/75 text-brand-700" radius="xl" size={36} variant="transparent">
                  <CollaboratorIcon size={18} />
                </ThemeIcon>
              </Group>
              <Group className="rounded-[18px] border border-slate-100/90 bg-slate-50/85 px-3 py-3" justify="space-between" wrap="nowrap">
                <Stack gap={2}>
                  <Text c="dimmed" fw={600} size="sm">
                    Estoque total monitorado
                  </Text>
                  <Text fw={800} size="lg">
                    {data.totais.consumiveis} itens em observacao
                  </Text>
                </Stack>
                <ThemeIcon className="border border-slate-200/90 bg-white/75 text-slate-700" radius="xl" size={36} variant="transparent">
                  <ConsumableIcon size={18} />
                </ThemeIcon>
              </Group>
            </Stack>
          </Stack>
        </AppCard>
      </div>
    </Stack>
  )
}
