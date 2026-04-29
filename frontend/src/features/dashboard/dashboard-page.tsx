import { Group, SimpleGrid, Stack, Table, Text } from '@mantine/core'
import { IconArchive, IconBuildingWarehouse, IconClockHour4, IconTrendingDown, IconUserStar, IconUsersGroup } from '@tabler/icons-react'

import { LoadingPanel } from '@/components/feedback/loading-panel'
import { AppCard } from '@/components/ui/app-card'
import { AppButton } from '@/components/ui/app-button'
import { DataTable } from '@/components/ui/data-table'
import { MetricCard } from '@/components/ui/metric-card'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAsyncData } from '@/hooks/use-async-data'
import { formatDate, formatDateTime } from '@/lib/format'
import { apiFetch } from '@/lib/api'
import type { DashboardData, Equipment } from '@/types/domain'


export function DashboardPage() {
  const { data, error, isLoading, reload } = useAsyncData(() => apiFetch<DashboardData>('/api/dashboard/'))

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
      icon: <IconArchive size={20} />,
    },
    {
      title: 'Em uso',
      value: data.totais.equipamentos_em_uso,
      description: 'Ativos vinculados aos colaboradores no momento.',
      icon: <IconClockHour4 size={20} />,
    },
    {
      title: 'Disponiveis',
      value: data.totais.equipamentos_disponiveis,
      description: 'Itens prontos para distribuicao imediata.',
      icon: <IconTrendingDown size={20} />,
    },
    {
      title: 'Manutencao',
      value: data.totais.equipamentos_manutencao,
      description: 'Equipamentos que exigem tratamento tecnico.',
      icon: <IconArchive size={20} />,
    },
    {
      title: 'Colaboradores ativos',
      value: data.totais.colaboradores_ativos,
      description: 'Base atual de colaboradores com acesso operacional.',
      icon: <IconUsersGroup size={20} />,
    },
    {
      title: 'Consumiveis monitorados',
      value: data.totais.consumiveis,
      description: 'Itens do almoxarifado com saldo e ponto minimo.',
      icon: <IconBuildingWarehouse size={20} />,
    },
  ]

  return (
    <Stack gap="xl">
      <PageHeader
        actions={
          <AppButton onClick={() => void reload()} variant="light">
            Atualizar painel
          </AppButton>
        }
        description="Leia a operacao por excecao: veja alertas, movimentacoes recentes e o estado atual do inventario sem excesso visual."
        title="Dashboard premium"
      />

      <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="lg">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="lg">
        <AppCard>
          <Stack gap="md">
            <Group justify="space-between">
              <Stack gap={2}>
                <Text fw={800} size="lg">
                  Alertas de estoque
                </Text>
                <Text c="dimmed" size="sm">
                  Consumiveis abaixo do ponto minimo exigem acao.
                </Text>
              </Stack>
              <StatusBadge label={`${data.alertas_estoque.length} alertas`} value="saida" />
            </Group>

            <Table.ScrollContainer minWidth={520}>
              <Table verticalSpacing="md">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Item</Table.Th>
                    <Table.Th>Saldo atual</Table.Th>
                    <Table.Th>Minimo</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.alertas_estoque.map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>{item.nome}</Table.Td>
                      <Table.Td>{item.quantidade_atual}</Table.Td>
                      <Table.Td>{item.estoque_minimo}</Table.Td>
                      <Table.Td>
                        <StatusBadge label="Reposicao sugerida" value="saida" />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Stack>
        </AppCard>

        <AppCard>
          <Stack gap="md">
            <Group justify="space-between">
              <Stack gap={2}>
                <Text fw={800} size="lg">
                  Ritmo da operacao
                </Text>
                <Text c="dimmed" size="sm">
                  Ultimas movimentacoes relevantes do almoxarifado.
                </Text>
              </Stack>
              <StatusBadge label="Auditoria ativa" value="entrada" />
            </Group>

            <Stack gap="sm">
              {data.movimentacoes_recentes.map((item) => (
                <Group
                  key={item.id}
                  className="rounded-3xl border border-slate-200/70 bg-slate-50/80 px-4 py-3"
                  justify="space-between"
                  wrap="wrap"
                >
                  <Stack gap={2}>
                    <Text fw={700}>{item.consumivel_nome}</Text>
                    <Text c="dimmed" size="sm">
                      {item.responsavel?.nome ?? 'Sem responsavel'} · {item.destino || 'Destino interno'}
                    </Text>
                  </Stack>
                  <Stack align="flex-end" gap={2}>
                    <StatusBadge label={item.tipo_label} value={item.tipo} />
                    <Text fw={700}>{item.quantidade} un.</Text>
                    <Text c="dimmed" size="xs">
                      {formatDateTime(item.data)}
                    </Text>
                  </Stack>
                </Group>
              ))}
            </Stack>
          </Stack>
        </AppCard>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="lg">
        <AppCard>
          <Stack gap="md">
            <Text fw={800} size="lg">
              Equipamentos recentes
            </Text>
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
              emptyIcon={<IconArchive size={18} />}
              emptyTitle="Sem equipamentos recentes"
              items={data.equipamentos_recentes}
              keyExtractor={(item) => item.id}
              minWidth={720}
            />
          </Stack>
        </AppCard>

        <AppCard>
          <Stack gap="md">
            <Text fw={800} size="lg">
              Resumo executivo
            </Text>
            <Stack gap="md">
              <Group className="rounded-3xl bg-brand-0/70 px-4 py-4" justify="space-between" wrap="nowrap">
                <Stack gap={2}>
                  <Text c="dimmed" fw={600} size="sm">
                    Cobertura de pessoas
                  </Text>
                  <Text fw={800} size="lg">
                    {data.totais.colaboradores_ativos} colaboradores ativos
                  </Text>
                </Stack>
                <IconUserStar className="text-brand-600" size={24} />
              </Group>
              <Group className="rounded-3xl bg-slate-50 px-4 py-4" justify="space-between" wrap="nowrap">
                <Stack gap={2}>
                  <Text c="dimmed" fw={600} size="sm">
                    Estoque total monitorado
                  </Text>
                  <Text fw={800} size="lg">
                    {data.totais.consumiveis} itens em observacao
                  </Text>
                </Stack>
                <IconBuildingWarehouse className="text-slate-700" size={24} />
              </Group>
            </Stack>
          </Stack>
        </AppCard>
      </SimpleGrid>
    </Stack>
  )
}
