import { useDeferredValue, useMemo, useState } from 'react'

import { ActionIcon, Group, Stack, Text, TextInput } from '@mantine/core'
import { modals } from '@mantine/modals'

import { LoadingPanel } from '@/components/feedback/loading-panel'
import { AppCard } from '@/components/ui/app-card'
import { AppButton } from '@/components/ui/app-button'
import { DataTable } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAsyncData } from '@/hooks/use-async-data'
import { apiFetch, getApiErrorMessage } from '@/lib/api'
import { appFeedback } from '@/lib/feedback'
import { actionIcons, screenIcons } from '@/lib/app-icons'
import type { TrashItem } from '@/types/domain'


type TrashResponse = {
  items: TrashItem[]
}


export function TrashPage() {
  const SearchIcon = actionIcons.search
  const RestoreIcon = actionIcons.restore
  const DestroyIcon = actionIcons.destroy
  const TrashIcon = screenIcons.trash
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const { data, error, isLoading, reload } = useAsyncData(() => apiFetch<TrashResponse>('/api/trash/'))

  const items = useMemo(
    () =>
      (data?.items ?? []).filter((item) =>
        `${item.nome} ${item.tipo} ${item.detalhe}`.toLowerCase().includes(deferredSearch.toLowerCase()),
      ),
    [data?.items, deferredSearch],
  )

  async function handleRestore(item: TrashItem) {
    try {
      await apiFetch(`/api/trash/${item.tipo}/${item.id}/restore/`, {
        method: 'POST',
      })
      appFeedback.success({
        title: 'Registro restaurado',
        message: `${item.nome} voltou para a operação.`,
      })
      await reload()
    } catch (error) {
      appFeedback.error({
        title: 'Falha ao restaurar',
        message: getApiErrorMessage(error),
      })
    }
  }

  function handleDelete(item: TrashItem) {
    modals.openConfirmModal({
      centered: true,
      title: 'Excluir permanentemente',
      children: <Text size="sm">Essa ação remove definitivamente "{item.nome}" do sistema.</Text>,
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await apiFetch(`/api/trash/${item.tipo}/${item.id}/`, {
            method: 'DELETE',
          })
          appFeedback.success({
            title: 'Registro removido',
            message: `${item.nome} foi excluído permanentemente.`,
          })
          await reload()
        } catch (error) {
          appFeedback.error({
            title: 'Falha ao excluir',
            message: getApiErrorMessage(error),
          })
        }
      },
    })
  }

  if (isLoading) {
    return <LoadingPanel label="Carregando lixeira..." />
  }

  if (!data) {
    return (
      <AppCard>
        <Stack gap="md">
          <Text fw={700}>Nao foi possivel carregar a lixeira.</Text>
          <Text c="dimmed">{error}</Text>
          <AppButton onClick={() => void reload()} w="fit-content">
            Tentar novamente
          </AppButton>
        </Stack>
      </AppCard>
    )
  }

  return (
    <Stack gap="lg">
      <PageHeader
        actions={
          <TextInput
            leftSection={<SearchIcon size={14} />}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Buscar item na lixeira"
            value={search}
            w={248}
          />
        }
        description="Faça restauração controlada ou descarte definitivo com leitura simples e segura."
        icon={<TrashIcon size={18} />}
        title="Lixeira operacional"
      />

      <AppCard>
        <DataTable<TrashItem>
          columns={[
            {
              key: 'nome',
              label: 'Registro',
              render: (item) => (
                <Stack gap={0}>
                  <Text fw={700}>{item.nome}</Text>
                  <Text c="dimmed" size="xs">
                    {item.detalhe}
                  </Text>
                </Stack>
              ),
            },
            {
              key: 'tipo',
              label: 'Tipo',
              width: 150,
              render: (item) => <StatusBadge label={item.badge} value={item.tipo} />,
            },
            {
              key: 'acoes',
              label: 'Acoes',
              width: 150,
                render: (item) => (
                  <Group gap="xs">
                    <ActionIcon color="teal" onClick={() => void handleRestore(item)} radius="xl" variant="light">
                      <RestoreIcon size={15} />
                    </ActionIcon>
                    <ActionIcon color="red" onClick={() => handleDelete(item)} radius="xl" variant="light">
                      <DestroyIcon size={15} />
                    </ActionIcon>
                  </Group>
                ),
              },
            ]}
            emptyDescription="Os itens enviados para exclusão lógica aparecerão aqui para restauração ou descarte definitivo."
            emptyIcon={<TrashIcon size={18} />}
            emptyTitle="A lixeira está vazia"
            items={items}
            keyExtractor={(item) => `${item.tipo}-${item.id}`}
          minWidth={720}
        />
      </AppCard>
    </Stack>
  )
}
