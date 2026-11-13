import { useDeferredValue, useMemo, useState } from 'react'

import { ActionIcon, Group, Stack, Text, TextInput } from '@mantine/core'
import { modals } from '@mantine/modals' // VOLTOU: O modals para perguntar se tem certeza

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
import { appFeedback } from '@/lib/feedback'
import { actionIcons, sectionIcons } from '@/lib/app-icons'
import type { Department } from '@/types/domain'

type DepartmentsResponse = {
  items: Department[]
}

export function DepartmentsPage() {
  const { refreshLookups } = useLookups()
  const { data, error, isLoading, reload } = useAsyncData(() => apiFetch<DepartmentsResponse>('/api/departments/'))
  
  const SearchIcon = actionIcons.search
  const AddIcon = actionIcons.add
  const EditIcon = actionIcons.edit
  const DeleteIcon = actionIcons.delete // VOLTOU: Ícone de lixeira
  
  const DepartmentsIcon = sectionIcons.categories
  
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [opened, setOpened] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
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

  function openEdit(item: Department) {
    setEditing(item)
    setNome(item.nome)
    setOpened(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)

    try {
      if (editing) {
        await apiFetch(`/api/departments/${editing.id}/`, {
          method: 'POST',
          body: JSON.stringify({ nome }),
        })
      } else {
        await apiFetch('/api/departments/', {
          method: 'POST',
          body: JSON.stringify({ nome }),
        })
      }

      appFeedback.success({
        title: editing ? 'Departamento atualizado' : 'Departamento criado',
        message: 'As informacoes foram salvas com sucesso.',
      })
      setOpened(false)
      await Promise.all([reload(), refreshLookups()])
    } catch (error) {
      appFeedback.error({
        title: 'Falha ao salvar departamento',
        message: getApiErrorMessage(error),
      })
    } finally {
      setIsSaving(false)
    }
  }

  // NOVO: Função para deletar
  function handleDelete(item: Department) {
    modals.openConfirmModal({
      centered: true,
      title: 'Excluir departamento',
      children: <Text size="sm">Deseja realmente excluir o departamento "{item.nome}"? Os colaboradores vinculados ficarão sem departamento.</Text>,
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await apiFetch(`/api/departments/${item.id}/`, {
            method: 'DELETE',
          })
          appFeedback.success({
            title: 'Departamento excluído',
            message: 'O departamento foi removido do cadastro.',
          })
          await Promise.all([reload(), refreshLookups()])
        } catch (error) {
          appFeedback.error({
            title: 'Não foi possível excluir',
            message: getApiErrorMessage(error),
          })
        }
      },
    })
  }

  // Corrigido para não perder o foco ao buscar
  if (isLoading && !data) {
    return <LoadingPanel label="Carregando departamentos..." />
  }

  if (!data) {
    return (
      <AppCard>
        <Stack gap="md">
          <Text fw={700}>Falha ao carregar departamentos.</Text>
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
      <Stack gap="lg">
        <PageHeader
          actions={
            <Group>
              <TextInput
                leftSection={<SearchIcon size={14} />}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Buscar departamento"
                value={search}
                w={240}
              />
              <AppButton leftSection={<AddIcon size={14} />} onClick={openCreate}>
                Novo departamento
              </AppButton>
            </Group>
          }
          description="Gerencie os setores da empresa para manter a vinculação de colaboradores e equipamentos organizada."
          icon={<DepartmentsIcon size={18} />}
          title="Departamentos Corporativos"
        />

        <Group grow>
          <MetricCard
            description="Setores disponíveis para alocação de colaboradores."
            icon={<DepartmentsIcon size={18} />}
            title="Departamentos cadastrados"
            value={data.items.length}
          />
        </Group>

        <AppCard>
          <DataTable<Department>
            columns={[
              {
                key: 'nome',
                label: 'Departamento',
                render: (item) => (
                  <Stack gap={0}>
                    <Text fw={700}>{item.nome}</Text>
                    <Text c="dimmed" size="xs">
                      Setor organizacional
                    </Text>
                  </Stack>
                ),
              },
              {
                key: 'acoes',
                label: 'Acoes',
                width: 140,
                render: (item) => (
                  <Group gap="xs">
                    <ActionIcon color="brand" onClick={() => openEdit(item)} radius="xl" variant="light">
                      <EditIcon size={15} />
                    </ActionIcon>
                    {/* NOVO: Botão de Lixeira */}
                    <ActionIcon color="red" onClick={() => handleDelete(item)} radius="xl" variant="light">
                      <DeleteIcon size={15} />
                    </ActionIcon>
                  </Group>
                ),
              },
            ]}
            emptyDescription="Crie departamentos como TI, RH, Comercial e Administrativo."
            emptyIcon={<DepartmentsIcon size={18} />}
            emptyTitle="Nenhum departamento encontrado"
            items={items}
            keyExtractor={(item) => item.id}
            minWidth={680}
          />
        </AppCard>
      </Stack>

      <AppModal onClose={() => setOpened(false)} opened={opened} size="lg" title={editing ? 'Editar departamento' : 'Novo departamento'}>
        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <TextInput
              label="Nome do departamento"
              onChange={(event) => setNome(event.currentTarget.value)}
              placeholder="Ex: Recursos Humanos"
              required
              value={nome}
            />
            <Group justify="flex-end">
              <AppButton color="gray" motionDisabled onClick={() => setOpened(false)} type="button" variant="subtle">
                Cancelar
              </AppButton>
              <AppButton loading={isSaving} type="submit">
                Salvar departamento
              </AppButton>
            </Group>
          </Stack>
        </form>
      </AppModal>
    </>
  )
}