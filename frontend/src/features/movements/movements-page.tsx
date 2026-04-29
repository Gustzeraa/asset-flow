import { useDeferredValue, useMemo, useState } from 'react'

import { Group, Select, Stack, Text, TextInput } from '@mantine/core'
import { IconDownload, IconHistory, IconSearch } from '@tabler/icons-react'

import { useLookups } from '@/app/lookups-context'
import { LoadingPanel } from '@/components/feedback/loading-panel'
import { AppCard } from '@/components/ui/app-card'
import { AppButton } from '@/components/ui/app-button'
import { DataTable } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAsyncData } from '@/hooks/use-async-data'
import { apiFetch } from '@/lib/api'
import { formatDateTime, formatNullable } from '@/lib/format'
import type { Movement } from '@/types/domain'


type MovementsResponse = {
  items: Movement[]
}


export function MovementsPage() {
  const { lookups } = useLookups()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [tipo, setTipo] = useState<string | null>(null)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (deferredSearch) params.set('search', deferredSearch)
    if (tipo) params.set('type', tipo)
    if (dataInicio) params.set('start_date', dataInicio)
    if (dataFim) params.set('end_date', dataFim)
    return params.toString()
  }, [dataFim, dataInicio, deferredSearch, tipo])

  const { data, error, isLoading, reload } = useAsyncData(
    () => apiFetch<MovementsResponse>(`/api/consumables/movements/${query ? `?${query}` : ''}`),
    [query],
  )

  if (isLoading) {
    return <LoadingPanel label="Carregando historico..." />
  }

  if (!data) {
    return (
      <AppCard>
        <Stack gap="md">
          <Text fw={700}>Nao foi possivel carregar o historico.</Text>
          <Text c="dimmed">{error}</Text>
          <AppButton onClick={() => void reload()} w="fit-content">
            Tentar novamente
          </AppButton>
        </Stack>
      </AppCard>
    )
  }

  return (
    <Stack gap="xl">
      <PageHeader
        actions={
          <Group>
            <AppButton component="a" href={`/api/consumables/movements/export/${query ? `?${query}` : ''}`} leftSection={<IconDownload size={16} />} variant="light">
              Exportar Excel
            </AppButton>
          </Group>
        }
        description="Audite entradas e saídas com filtros refinados por período, responsável e destino."
        title="Historico de movimentacoes"
      />

      <AppCard>
        <Group align="flex-end" grow>
          <TextInput
            leftSection={<IconSearch size={16} />}
            label="Buscar"
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Item, responsável, destino ou observação"
            value={search}
          />
          <Select
            clearable
            data={lookups?.movimentacao_tipos ?? []}
            label="Tipo"
            onChange={setTipo}
            placeholder="Todos"
            value={tipo}
          />
          <TextInput label="Data inicial" onChange={(event) => setDataInicio(event.currentTarget.value)} type="date" value={dataInicio} />
          <TextInput label="Data final" onChange={(event) => setDataFim(event.currentTarget.value)} type="date" value={dataFim} />
        </Group>
      </AppCard>

      <AppCard>
        <DataTable<Movement>
          columns={[
            {
              key: 'data',
              label: 'Data',
              width: 160,
              render: (item) => formatDateTime(item.data),
            },
            {
              key: 'item',
              label: 'Item',
              render: (item) => (
                <Stack gap={0}>
                  <Text fw={700}>{item.consumivel_nome}</Text>
                  <Text c="dimmed" size="xs">
                    ID {item.consumivel_id}
                  </Text>
                </Stack>
              ),
            },
            {
              key: 'tipo',
              label: 'Tipo',
              width: 160,
              render: (item) => <StatusBadge label={item.tipo_label} value={item.tipo} />,
            },
            {
              key: 'quantidade',
              label: 'Quantidade',
              width: 120,
              render: (item) => item.quantidade,
            },
            {
              key: 'responsavel',
              label: 'Responsavel',
              render: (item) => item.responsavel?.nome ?? 'Sem responsavel',
            },
            {
              key: 'destino',
              label: 'Destino',
              render: (item) => formatNullable(item.destino),
            },
            {
              key: 'observacao',
              label: 'Observacao',
              render: (item) => formatNullable(item.observacao),
            },
          ]}
          emptyDescription="Os registros de entrada e saída do almoxarifado aparecerão aqui."
          emptyIcon={<IconHistory size={18} />}
          emptyTitle="Nenhuma movimentacao encontrada"
          items={data.items}
          keyExtractor={(item) => item.id}
          minWidth={1120}
        />
      </AppCard>
    </Stack>
  )
}
