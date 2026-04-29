import { useDeferredValue, useMemo, useState } from 'react'

import { ActionIcon, Group, Stack, Text, TextInput } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconEdit, IconFolders, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react'

import { useLookups } from '@/app/lookups-context'
import { LoadingPanel } from '@/components/feedback/loading-panel'
import { AppCard } from '@/components/ui/app-card'
import { AppButton } from '@/components/ui/app-button'
import { AppModal } from '@/components/ui/app-modal'
import { DataTable } from '@/components/ui/data-table'
import { MetricCard } from '@/components/ui/metric-card'
import { PageHeader } from '@/components/ui/page-header'
import { useAsyncData } from '@/hooks/use-async-data'
import { apiFetch, getApiErrorMessage } from '@/lib/api'
import type { Category } from '@/types/domain'


type CategoriesResponse = {
  items: Category[]
}


export function CategoriesPage() {
  const { refreshLookups } = useLookups()
  const { data, error, isLoading, reload } = useAsyncData(() => apiFetch<CategoriesResponse>('/api/categories/'))
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [opened, setOpened] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [nome, setNome] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const items = useMemo(
    () =>
      (data?.items ?? []).filter((item) => item.nome.toLowerCase().includes(deferredSearch.toLowerCase())),
    [data?.items, deferredSearch],
  )

  function openCreate() {
    setEditing(null)
    setNome('')
    setOpened(true)
  }

  function openEdit(item: Category) {
    setEditing(item)
    setNome(item.nome)
    setOpened(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)

    try {
      if (editing) {
        await apiFetch(`/api/categories/${editing.id}/`, {
          method: 'POST',
          body: JSON.stringify({ nome }),
        })
      } else {
        await apiFetch('/api/categories/', {
          method: 'POST',
          body: JSON.stringify({ nome }),
        })
      }

      notifications.show({
        color: 'teal',
        title: editing ? 'Categoria atualizada' : 'Categoria criada',
        message: 'As informacoes foram salvas com sucesso.',
      })
      setOpened(false)
      await Promise.all([reload(), refreshLookups()])
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Falha ao salvar categoria',
        message: getApiErrorMessage(error),
      })
    } finally {
      setIsSaving(false)
    }
  }

  function handleDelete(item: Category) {
    modals.openConfirmModal({
      centered: true,
      title: 'Excluir categoria',
      children: <Text size="sm">Deseja realmente excluir a categoria "{item.nome}"?</Text>,
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await apiFetch(`/api/categories/${item.id}/`, {
            method: 'DELETE',
          })
          notifications.show({
            color: 'teal',
            title: 'Categoria excluida',
            message: 'A categoria foi removida do cadastro.',
          })
          await Promise.all([reload(), refreshLookups()])
        } catch (error) {
          notifications.show({
            color: 'red',
            title: 'Nao foi possivel excluir',
            message: getApiErrorMessage(error),
          })
        }
      },
    })
  }

  if (isLoading) {
    return <LoadingPanel label="Carregando categorias..." />
  }

  if (!data) {
    return (
      <AppCard>
        <Stack gap="md">
          <Text fw={700}>Falha ao carregar categorias.</Text>
          <Text c="dimmed">{error}</Text>
          <AppButton onClick={() => void reload()} w="fit-content">
            Tentar novamente
          </AppButton>
        </Stack>
      </AppCard>
    )
  }

  return (
    <>
      <Stack gap="xl">
        <PageHeader
          actions={
            <Group>
              <TextInput
                leftSection={<IconSearch size={16} />}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Buscar categoria"
                value={search}
                w={260}
              />
              <AppButton leftSection={<IconPlus size={16} />} onClick={openCreate}>
                Nova categoria
              </AppButton>
            </Group>
          }
          description="Padronize a estrutura do inventario para manter filtros, relatórios e cadastros consistentes."
          title="Categorias de ativos"
        />

        <Group grow>
          <MetricCard
            description="Taxonomia ativa para classificacao do parque."
            icon={<IconFolders size={20} />}
            title="Categorias cadastradas"
            value={data.items.length}
          />
        </Group>

        <AppCard>
          <DataTable<Category>
            columns={[
              {
                key: 'nome',
                label: 'Categoria',
                render: (item) => (
                  <Stack gap={0}>
                    <Text fw={700}>{item.nome}</Text>
                    <Text c="dimmed" size="xs">
                      Estrutura visual e operacional do inventario
                    </Text>
                  </Stack>
                ),
              },
              {
                key: 'equipamentos_count',
                label: 'Itens vinculados',
                width: 180,
                render: (item) => item.equipamentos_count ?? 0,
              },
              {
                key: 'acoes',
                label: 'Acoes',
                width: 140,
                render: (item) => (
                  <Group gap="xs">
                    <ActionIcon color="brand" onClick={() => openEdit(item)} radius="xl" variant="light">
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon color="red" onClick={() => handleDelete(item)} radius="xl" variant="light">
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                ),
              },
            ]}
            emptyDescription="Crie categorias para classificar notebooks, monitores, periféricos e demais ativos."
            emptyIcon={<IconFolders size={18} />}
            emptyTitle="Nenhuma categoria encontrada"
            items={items}
            keyExtractor={(item) => item.id}
            minWidth={680}
          />
        </AppCard>
      </Stack>

      <AppModal onClose={() => setOpened(false)} opened={opened} size="lg" title={editing ? 'Editar categoria' : 'Nova categoria'}>
        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <TextInput
              label="Nome da categoria"
              onChange={(event) => setNome(event.currentTarget.value)}
              placeholder="Ex: Notebook corporativo"
              required
              value={nome}
            />
            <Group justify="flex-end">
              <AppButton color="gray" motionDisabled onClick={() => setOpened(false)} type="button" variant="subtle">
                Cancelar
              </AppButton>
              <AppButton loading={isSaving} type="submit">
                Salvar categoria
              </AppButton>
            </Group>
          </Stack>
        </form>
      </AppModal>
    </>
  )
}
