import { useDeferredValue, useMemo, useState } from 'react'

import { ActionIcon, Badge, Group, ScrollArea, SimpleGrid, Stack, Switch, Text, TextInput } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconEdit, IconFileTypePdf, IconSearch, IconTrash, IconUserPlus, IconUsersGroup } from '@tabler/icons-react'

import { useLookups } from '@/app/lookups-context'
import { LoadingPanel } from '@/components/feedback/loading-panel'
import { AppCard } from '@/components/ui/app-card'
import { AppButton } from '@/components/ui/app-button'
import { AppModal } from '@/components/ui/app-modal'
import { DataTable } from '@/components/ui/data-table'
import { MetricCard } from '@/components/ui/metric-card'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAsyncData } from '@/hooks/use-async-data'
import { apiFetch, getApiErrorMessage } from '@/lib/api'
import type { Collaborator } from '@/types/domain'


type CollaboratorsResponse = {
  items: Collaborator[]
}

type CollaboratorFormState = {
  nome: string
  cpf: string
  cargo: string
  departamento: string
  email: string
  ativo: boolean
}

const initialForm: CollaboratorFormState = {
  nome: '',
  cpf: '',
  cargo: '',
  departamento: '',
  email: '',
  ativo: true,
}


export function CollaboratorsPage() {
  const { refreshLookups } = useLookups()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const { data, error, isLoading, reload } = useAsyncData(
    () => apiFetch<CollaboratorsResponse>(`/api/collaborators/?search=${encodeURIComponent(deferredSearch)}`),
    [deferredSearch],
  )
  const [opened, setOpened] = useState(false)
  const [editing, setEditing] = useState<Collaborator | null>(null)
  const [form, setForm] = useState<CollaboratorFormState>(initialForm)
  const [isSaving, setIsSaving] = useState(false)

  const items = useMemo(() => data?.items ?? [], [data?.items])

  function openCreate() {
    setEditing(null)
    setForm(initialForm)
    setOpened(true)
  }

  function openEdit(item: Collaborator) {
    setEditing(item)
    setForm({
      nome: item.nome,
      cpf: item.cpf ?? '',
      cargo: item.cargo,
      departamento: item.departamento,
      email: item.email,
      ativo: item.ativo,
    })
    setOpened(true)
  }

  function updateField<Key extends keyof CollaboratorFormState>(key: Key, value: CollaboratorFormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)

    try {
      if (editing) {
        await apiFetch(`/api/collaborators/${editing.id}/`, {
          method: 'POST',
          body: JSON.stringify(form),
        })
      } else {
        await apiFetch('/api/collaborators/', {
          method: 'POST',
          body: JSON.stringify(form),
        })
      }

      notifications.show({
        color: 'teal',
        title: editing ? 'Colaborador atualizado' : 'Colaborador cadastrado',
        message: 'Os dados foram sincronizados com sucesso.',
      })
      setOpened(false)
      await Promise.all([reload(), refreshLookups()])
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Falha ao salvar colaborador',
        message: getApiErrorMessage(error),
      })
    } finally {
      setIsSaving(false)
    }
  }

  function handleTrash(item: Collaborator) {
    modals.openConfirmModal({
      centered: true,
      title: 'Mover para a lixeira',
      children: <Text size="sm">Deseja mover "{item.nome}" para a lixeira operacional?</Text>,
      labels: { confirm: 'Mover', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await apiFetch(`/api/collaborators/${item.id}/trash/`, {
            method: 'POST',
          })
          notifications.show({
            color: 'teal',
            title: 'Registro movido',
            message: 'O colaborador foi enviado para a lixeira.',
          })
          await Promise.all([reload(), refreshLookups()])
        } catch (error) {
          notifications.show({
            color: 'red',
            title: 'Falha ao mover registro',
            message: getApiErrorMessage(error),
          })
        }
      },
    })
  }

  if (isLoading) {
    return <LoadingPanel label="Carregando colaboradores..." />
  }

  if (!data) {
    return (
      <AppCard>
        <Stack gap="md">
          <Text fw={700}>Nao foi possivel carregar os colaboradores.</Text>
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
                placeholder="Buscar colaborador"
                value={search}
                w={280}
              />
              <AppButton leftSection={<IconUserPlus size={16} />} onClick={openCreate}>
                Novo colaborador
              </AppButton>
            </Group>
          }
          description="Gerencie pessoas, ativos vinculados e geração de termos de responsabilidade em uma única visão."
          title="Gestao de colaboradores"
        />

        <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
          <MetricCard
            description="Base operacional disponível para vinculação de ativos."
            icon={<IconUsersGroup size={20} />}
            title="Registros ativos"
            value={items.filter((item) => item.ativo).length}
          />
          <MetricCard
            description="Colaboradores atualmente com patrimônio associado."
            icon={<IconUsersGroup size={20} />}
            title="Com ativos vinculados"
            value={items.filter((item) => item.ativos_count > 0).length}
          />
          <MetricCard
            description="Times visíveis neste recorte da operação."
            icon={<IconUsersGroup size={20} />}
            title="Departamentos distintos"
            value={new Set(items.map((item) => item.departamento)).size}
          />
        </SimpleGrid>

        <AppCard>
          <DataTable<Collaborator>
            columns={[
              {
                key: 'nome',
                label: 'Colaborador',
                render: (item) => (
                  <Stack gap={0}>
                    <Text fw={700}>{item.nome}</Text>
                    <Text c="dimmed" size="xs">
                      {item.cargo}
                    </Text>
                  </Stack>
                ),
              },
              {
                key: 'departamento',
                label: 'Departamento',
                render: (item) => item.departamento,
              },
              {
                key: 'email',
                label: 'Contato',
                render: (item) => item.email,
              },
              {
                key: 'status',
                label: 'Status',
                width: 140,
                render: (item) => <StatusBadge label={item.ativo ? 'Ativo' : 'Inativo'} value={item.ativo ? 'entrada' : 'saida'} />,
              },
              {
                key: 'ativos_count',
                label: 'Ativos',
                width: 120,
                render: (item) => item.ativos_count,
              },
              {
                key: 'acoes',
                label: 'Acoes',
                width: 160,
                render: (item) => (
                  <Group gap="xs">
                    <ActionIcon color="brand" onClick={() => openEdit(item)} radius="xl" variant="light">
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon color="grape" onClick={() => window.open(`/api/collaborators/${item.id}/term/`, '_blank', 'noopener,noreferrer')} radius="xl" variant="light">
                      <IconFileTypePdf size={16} />
                    </ActionIcon>
                    <ActionIcon color="red" onClick={() => handleTrash(item)} radius="xl" variant="light">
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                ),
              },
            ]}
            emptyDescription="Cadastre colaboradores para responsabilização de ativos e rastreio operacional."
            emptyIcon={<IconUsersGroup size={18} />}
            emptyTitle="Nenhum colaborador encontrado"
            items={items}
            keyExtractor={(item) => item.id}
            minWidth={880}
          />
        </AppCard>
      </Stack>

      <AppModal onClose={() => setOpened(false)} opened={opened} size="xl" title={editing ? 'Editar colaborador' : 'Novo colaborador'}>
        <form onSubmit={handleSubmit}>
          <Stack gap="xl">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              <TextInput label="Nome completo" onChange={(event) => updateField('nome', event.currentTarget.value)} required value={form.nome} />
              <TextInput label="CPF" onChange={(event) => updateField('cpf', event.currentTarget.value)} placeholder="000.000.000-00" required value={form.cpf} />
              <TextInput label="Cargo" onChange={(event) => updateField('cargo', event.currentTarget.value)} required value={form.cargo} />
              <TextInput label="Departamento" onChange={(event) => updateField('departamento', event.currentTarget.value)} required value={form.departamento} />
              <TextInput className="md:col-span-2" label="Email" onChange={(event) => updateField('email', event.currentTarget.value)} required type="email" value={form.email} />
            </SimpleGrid>

            <Group justify="space-between" wrap="wrap">
              <Switch checked={form.ativo} label="Colaborador ativo" onChange={(event) => updateField('ativo', event.currentTarget.checked)} />
              {editing?.ativos.length ? (
                <ScrollArea.Autosize mah={110} maw={420}>
                  <Group gap="xs">
                    {editing.ativos.map((asset) => (
                      <Badge key={asset.id} radius="xl" variant="light">
                        {asset.nome} · {asset.num_patrimonio}
                      </Badge>
                    ))}
                  </Group>
                </ScrollArea.Autosize>
              ) : null}
            </Group>

            <Group justify="flex-end">
              <AppButton color="gray" motionDisabled onClick={() => setOpened(false)} type="button" variant="subtle">
                Cancelar
              </AppButton>
              <AppButton loading={isSaving} type="submit">
                Salvar colaborador
              </AppButton>
            </Group>
          </Stack>
        </form>
      </AppModal>
    </>
  )
}
