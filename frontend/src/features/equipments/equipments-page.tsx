import { useDeferredValue, useEffect, useMemo, useState } from 'react'

import {
  ActionIcon,
  FileInput,
  Group,
  Image,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import {
  IconArchive,
  IconArrowAutofitRight,
  IconCategory,
  IconCloudDownload,
  IconCloudUpload,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react'

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
import { formatDate, formatNullable } from '@/lib/format'
import { toFormData } from '@/lib/forms'
import type { Equipment } from '@/types/domain'


type EquipmentListResponse = {
  items: Equipment[]
  summary: {
    total: number
    disponiveis: number
    em_uso: number
    manutencao: number
  }
}

type EquipmentFormState = {
  data: string
  nome: string
  num_patrimonio: string
  categoria: string
  local: string
  tipo: string
  departamento: string
  descricao: string
  status: string
  responsavel: string
  validador: string
  observacao: string
  foto: File | null
}

const today = new Date().toISOString().slice(0, 10)

function createInitialEquipmentForm(defaultStatus: string): EquipmentFormState {
  return {
    data: today,
    nome: '',
    num_patrimonio: '',
    categoria: '',
    local: '',
    tipo: '',
    departamento: '',
    descricao: '',
    status: defaultStatus,
    responsavel: '',
    validador: '',
    observacao: '',
    foto: null,
  }
}


export function EquipmentsPage() {
  const { lookups, refreshLookups } = useLookups()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [categoria, setCategoria] = useState<string | null>(null)
  const [ordenacao, setOrdenacao] = useState<string | null>(null)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (deferredSearch) params.set('search', deferredSearch)
    if (categoria) params.set('category', categoria)
    if (ordenacao) params.set('ordering', ordenacao)
    if (dataInicio) params.set('start_date', dataInicio)
    if (dataFim) params.set('end_date', dataFim)
    return params.toString()
  }, [categoria, dataFim, dataInicio, deferredSearch, ordenacao])

  const { data, error, isLoading, reload } = useAsyncData(
    () => apiFetch<EquipmentListResponse>(`/api/equipments/${query ? `?${query}` : ''}`),
    [query],
  )
  const [opened, setOpened] = useState(false)
  const [transferOpened, setTransferOpened] = useState(false)
  const [categoryOpened, setCategoryOpened] = useState(false)
  const [importOpened, setImportOpened] = useState(false)
  const [editing, setEditing] = useState<Equipment | null>(null)
  const [transferTarget, setTransferTarget] = useState<Equipment | null>(null)
  const [transferResponsavel, setTransferResponsavel] = useState<string | null>(null)
  const [bulkCategoria, setBulkCategoria] = useState<string | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [form, setForm] = useState<EquipmentFormState>(createInitialEquipmentForm('disponivel'))
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const items = useMemo(() => data?.items ?? [], [data?.items])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [data?.items])

  function updateForm<Key extends keyof EquipmentFormState>(key: Key, value: EquipmentFormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function openCreate() {
    setEditing(null)
    setForm(createInitialEquipmentForm(lookups?.equipamento_status[0]?.value ?? 'disponivel'))
    setOpened(true)
  }

  function openEdit(item: Equipment) {
    setEditing(item)
    setForm({
      data: item.data?.slice(0, 10) ?? today,
      nome: item.nome,
      num_patrimonio: item.num_patrimonio,
      categoria: item.categoria_id ? String(item.categoria_id) : '',
      local: item.local ?? '',
      tipo: item.tipo ?? '',
      departamento: item.departamento ?? '',
      descricao: item.descricao ?? '',
      status: item.status,
      responsavel: item.responsavel_id ? String(item.responsavel_id) : '',
      validador: item.validador_id ? String(item.validador_id) : '',
      observacao: item.observacao ?? '',
      foto: null,
    })
    setOpened(true)
  }

  function openSingleTransfer(item: Equipment) {
    setTransferTarget(item)
    setTransferResponsavel(item.responsavel_id ? String(item.responsavel_id) : null)
    setTransferOpened(true)
  }

  function openBulkTransfer() {
    setTransferTarget(null)
    setTransferResponsavel(null)
    setTransferOpened(true)
  }

  function toggleSelection(id: number, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelectedIds(new Set())
      return
    }

    setSelectedIds(new Set(items.map((item) => item.id)))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)

    const payload = toFormData({
      data: form.data,
      nome: form.nome,
      num_patrimonio: form.num_patrimonio,
      categoria: form.categoria,
      local: form.local,
      tipo: form.tipo,
      departamento: form.departamento,
      descricao: form.descricao,
      status: form.status,
      responsavel: form.responsavel,
      validador: form.validador,
      observacao: form.observacao,
      foto: form.foto ?? undefined,
    })

    try {
      if (editing) {
        await apiFetch(`/api/equipments/${editing.id}/`, {
          method: 'POST',
          body: payload,
        })
      } else {
        await apiFetch('/api/equipments/', {
          method: 'POST',
          body: payload,
        })
      }

      notifications.show({
        color: 'teal',
        title: editing ? 'Equipamento atualizado' : 'Equipamento criado',
        message: 'O inventario foi sincronizado com sucesso.',
      })
      setOpened(false)
      await reload()
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Falha ao salvar equipamento',
        message: getApiErrorMessage(error),
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleTransferSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsTransferring(true)

    try {
      if (transferTarget) {
        await apiFetch(`/api/equipments/${transferTarget.id}/transfer/`, {
          method: 'POST',
          body: JSON.stringify({ responsavel_id: transferResponsavel ?? '' }),
        })
      } else {
        await apiFetch('/api/equipments/bulk/transfer/', {
          method: 'POST',
          body: JSON.stringify({
            ids: Array.from(selectedIds),
            responsavel_id: transferResponsavel ?? '',
          }),
        })
      }

      notifications.show({
        color: 'teal',
        title: 'Transferencia concluida',
        message: transferTarget ? 'O equipamento foi transferido.' : 'Os equipamentos selecionados foram transferidos.',
      })
      setTransferOpened(false)
      await reload()
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Falha na transferencia',
        message: getApiErrorMessage(error),
      })
    } finally {
      setIsTransferring(false)
    }
  }

  async function handleBulkCategorySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      await apiFetch('/api/equipments/bulk/category/', {
        method: 'POST',
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          category_id: bulkCategoria,
        }),
      })
      notifications.show({
        color: 'teal',
        title: 'Categoria atualizada',
        message: 'Os equipamentos selecionados receberam a nova categoria.',
      })
      setCategoryOpened(false)
      await reload()
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Falha ao alterar categoria',
        message: getApiErrorMessage(error),
      })
    }
  }

  async function handleImportSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!importFile) {
      return
    }

    setIsImporting(true)

    const formData = new FormData()
    formData.append('file', importFile)

    try {
      const response = await apiFetch<{ detail: string; successes: number; errors: string[] }>('/api/equipments/import/', {
        method: 'POST',
        body: formData,
      })
      notifications.show({
        color: response.errors.length ? 'yellow' : 'teal',
        title: 'Importacao concluida',
        message: `${response.successes} item(ns) importado(s). ${response.errors.length ? `${response.errors.length} erro(s) detectado(s).` : ''}`,
      })
      setImportOpened(false)
      setImportFile(null)
      await Promise.all([reload(), refreshLookups()])
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Falha na importacao',
        message: getApiErrorMessage(error),
      })
    } finally {
      setIsImporting(false)
    }
  }

  function handleTrash(item: Equipment) {
    modals.openConfirmModal({
      centered: true,
      title: 'Mover equipamento para a lixeira',
      children: <Text size="sm">Deseja mover "{item.nome}" para a lixeira operacional?</Text>,
      labels: { confirm: 'Mover', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await apiFetch(`/api/equipments/${item.id}/trash/`, {
            method: 'POST',
          })
          notifications.show({
            color: 'teal',
            title: 'Equipamento movido',
            message: 'O equipamento foi enviado para a lixeira.',
          })
          await reload()
        } catch (error) {
          notifications.show({
            color: 'red',
            title: 'Falha ao mover equipamento',
            message: getApiErrorMessage(error),
          })
        }
      },
    })
  }

  function handleBulkTrash() {
    modals.openConfirmModal({
      centered: true,
      title: 'Mover lote para a lixeira',
      children: <Text size="sm">Deseja mover os {selectedIds.size} equipamentos selecionados para a lixeira?</Text>,
      labels: { confirm: 'Mover lote', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await apiFetch('/api/equipments/bulk/trash/', {
            method: 'POST',
            body: JSON.stringify({
              ids: Array.from(selectedIds),
            }),
          })
          notifications.show({
            color: 'teal',
            title: 'Lote movido',
            message: 'Os equipamentos selecionados foram enviados para a lixeira.',
          })
          await reload()
        } catch (error) {
          notifications.show({
            color: 'red',
            title: 'Falha ao mover lote',
            message: getApiErrorMessage(error),
          })
        }
      },
    })
  }

  if (isLoading) {
    return <LoadingPanel label="Carregando inventario..." />
  }

  if (!data) {
    return (
      <AppCard>
        <Stack gap="md">
          <Text fw={700}>Nao foi possivel carregar o inventario.</Text>
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
              <AppButton component="a" href="/api/equipments/import/template/" leftSection={<IconCloudDownload size={16} />} variant="light">
                Baixar modelo
              </AppButton>
              <AppButton component="a" href={`/api/equipments/export/${query ? `?${query}` : ''}`} leftSection={<IconCloudDownload size={16} />} variant="light">
                Exportar CSV
              </AppButton>
              <AppButton leftSection={<IconCloudUpload size={16} />} onClick={() => setImportOpened(true)} variant="light">
                Importar CSV
              </AppButton>
              <AppButton leftSection={<IconPlus size={16} />} onClick={openCreate}>
                Novo equipamento
              </AppButton>
            </Group>
          }
          description="Controle patrimonial com filtros objetivos, ações em lote e formulários claros para operação diária."
          title="Gestao de equipamentos"
        />

        <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="lg">
          <MetricCard description="Base visível no inventário atual." icon={<IconArchive size={20} />} title="Total filtrado" value={data.summary.total} />
          <MetricCard description="Prontos para uso ou redistribuição." icon={<IconArchive size={20} />} title="Disponiveis" value={data.summary.disponiveis} />
          <MetricCard description="Vinculados a colaboradores." icon={<IconArrowAutofitRight size={20} />} title="Em uso" value={data.summary.em_uso} />
          <MetricCard description="Itens em análise ou reparo." icon={<IconCategory size={20} />} title="Manutencao" value={data.summary.manutencao} />
        </SimpleGrid>

        <AppCard>
          <Group align="flex-end" grow>
            <TextInput
              leftSection={<IconSearch size={16} />}
              label="Buscar"
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Patrimônio, categoria, responsável ou local"
              value={search}
            />
            <Select
              clearable
              data={lookups?.categorias.map((item) => ({ value: String(item.id), label: item.nome })) ?? []}
              label="Categoria"
              onChange={setCategoria}
              placeholder="Todas"
              value={categoria}
            />
            <Select
              clearable
              data={[
                { value: '-id', label: 'Mais recentes' },
                { value: 'data', label: 'Registro crescente' },
                { value: '-data', label: 'Registro decrescente' },
                { value: 'nome', label: 'Nome A-Z' },
                { value: '-nome', label: 'Nome Z-A' },
              ]}
              label="Ordenacao"
              onChange={setOrdenacao}
              placeholder="Padrao"
              value={ordenacao}
            />
            <TextInput label="Data inicial" onChange={(event) => setDataInicio(event.currentTarget.value)} type="date" value={dataInicio} />
            <TextInput label="Data final" onChange={(event) => setDataFim(event.currentTarget.value)} type="date" value={dataFim} />
          </Group>
        </AppCard>

        {selectedIds.size > 0 ? (
          <AppCard className="border-brand-200 bg-brand-0/70">
            <Group justify="space-between" wrap="wrap">
              <Stack gap={2}>
                <Text fw={800}>{selectedIds.size} equipamento(s) selecionado(s)</Text>
                <Text c="dimmed" size="sm">
                  Execute ações em lote mantendo o fluxo do inventário consistente.
                </Text>
              </Stack>
              <Group>
                <AppButton color="dark" onClick={openBulkTransfer} variant="light">
                  Transferir lote
                </AppButton>
                <AppButton color="dark" onClick={() => setCategoryOpened(true)} variant="light">
                  Alterar categoria
                </AppButton>
                <AppButton color="red" onClick={handleBulkTrash} variant="light">
                  Enviar para lixeira
                </AppButton>
              </Group>
            </Group>
          </AppCard>
        ) : null}

        <AppCard>
          <DataTable<Equipment>
            columns={[
              {
                key: 'patrimonio',
                label: 'Patrimonio',
                width: 160,
                render: (item) => (
                  <Stack gap={0}>
                    <Text fw={700}>{item.num_patrimonio}</Text>
                    <Text c="dimmed" size="xs">
                      {formatDate(item.data)}
                    </Text>
                  </Stack>
                ),
              },
              {
                key: 'item',
                label: 'Equipamento',
                render: (item) => (
                  <Group wrap="nowrap">
                    {item.foto_url ? (
                      <Image alt={item.nome} className="rounded-2xl border border-slate-200" h={52} radius="lg" src={item.foto_url} w={52} />
                    ) : (
                      <div className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <IconArchive size={20} />
                      </div>
                    )}
                    <Stack gap={0}>
                      <Text fw={700}>{item.nome}</Text>
                      <Text c="dimmed" size="xs">
                        {item.categoria?.nome ?? 'Sem categoria'} · {formatNullable(item.tipo)}
                      </Text>
                    </Stack>
                  </Group>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                width: 160,
                render: (item) => <StatusBadge label={item.status_label} value={item.status} />,
              },
              {
                key: 'responsavel',
                label: 'Responsavel',
                render: (item) => (
                  <Stack gap={0}>
                    <Text>{item.responsavel?.nome ?? 'Estoque interno'}</Text>
                    <Text c="dimmed" size="xs">
                      {item.departamento ?? item.responsavel?.departamento ?? 'Sem departamento'}
                    </Text>
                  </Stack>
                ),
              },
              {
                key: 'local',
                label: 'Local',
                width: 180,
                render: (item) => formatNullable(item.local),
              },
              {
                key: 'acoes',
                label: 'Acoes',
                width: 180,
                render: (item) => (
                  <Group gap="xs">
                    <ActionIcon color="teal" onClick={() => openSingleTransfer(item)} radius="xl" variant="light">
                      <IconArrowAutofitRight size={16} />
                    </ActionIcon>
                    <ActionIcon color="brand" onClick={() => openEdit(item)} radius="xl" variant="light">
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon color="red" onClick={() => handleTrash(item)} radius="xl" variant="light">
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                ),
              },
            ]}
            emptyDescription="Cadastre o parque de equipamentos para acompanhar patrimônio, responsáveis, status e movimentações."
            emptyIcon={<IconArchive size={18} />}
            emptyTitle="Nenhum equipamento encontrado"
            items={items}
            keyExtractor={(item) => item.id}
            minWidth={1220}
            onToggleAll={toggleAll}
            onToggleRow={toggleSelection}
            rowId={(item) => item.id}
            selectedIds={selectedIds}
          />
        </AppCard>
      </Stack>

      <AppModal onClose={() => setOpened(false)} opened={opened} size="xl" title={editing ? 'Editar equipamento' : 'Novo equipamento'}>
        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              <TextInput label="Data de registro" onChange={(event) => updateForm('data', event.currentTarget.value)} required type="date" value={form.data} />
              <TextInput label="Patrimonio" onChange={(event) => updateForm('num_patrimonio', event.currentTarget.value)} required value={form.num_patrimonio} />
              <TextInput label="Nome do equipamento" onChange={(event) => updateForm('nome', event.currentTarget.value)} required value={form.nome} />
              <Select
                data={lookups?.categorias.map((item) => ({ value: String(item.id), label: item.nome })) ?? []}
                label="Categoria"
                onChange={(value) => updateForm('categoria', value ?? '')}
                required
                value={form.categoria}
              />
              <TextInput label="Local" onChange={(event) => updateForm('local', event.currentTarget.value)} value={form.local} />
              <TextInput label="Tipo" onChange={(event) => updateForm('tipo', event.currentTarget.value)} value={form.tipo} />
              <TextInput label="Departamento" onChange={(event) => updateForm('departamento', event.currentTarget.value)} value={form.departamento} />
              <Select
                data={lookups?.equipamento_status ?? []}
                label="Status"
                onChange={(value) => updateForm('status', value ?? 'disponivel')}
                required
                value={form.status}
              />
              <Select
                clearable
                data={lookups?.colaboradores.map((item) => ({ value: String(item.id), label: item.nome })) ?? []}
                label="Responsavel"
                onChange={(value) => updateForm('responsavel', value ?? '')}
                placeholder="Sem responsavel"
                value={form.responsavel}
              />
              <Select
                clearable
                data={lookups?.colaboradores.map((item) => ({ value: String(item.id), label: item.nome })) ?? []}
                label="Validador"
                onChange={(value) => updateForm('validador', value ?? '')}
                placeholder="Sem validador"
                value={form.validador}
              />
            </SimpleGrid>
            <Textarea autosize label="Descricao" minRows={3} onChange={(event) => updateForm('descricao', event.currentTarget.value)} value={form.descricao} />
            <Textarea autosize label="Observacao" minRows={3} onChange={(event) => updateForm('observacao', event.currentTarget.value)} value={form.observacao} />
            <FileInput
              accept="image/*"
              label="Foto do equipamento"
              onChange={(file) => updateForm('foto', file)}
              placeholder="Selecione uma imagem"
              value={form.foto}
            />
            <Group justify="flex-end">
              <AppButton color="gray" motionDisabled onClick={() => setOpened(false)} type="button" variant="subtle">
                Cancelar
              </AppButton>
              <AppButton loading={isSaving} type="submit">
                Salvar equipamento
              </AppButton>
            </Group>
          </Stack>
        </form>
      </AppModal>

      <AppModal
        onClose={() => setTransferOpened(false)}
        opened={transferOpened}
        size="lg"
        title={transferTarget ? `Transferir ${transferTarget.nome}` : `Transferir ${selectedIds.size} equipamentos`}
      >
        <form onSubmit={handleTransferSubmit}>
          <Stack gap="lg">
            <Select
              clearable
              data={[
                { value: '', label: 'Devolver ao estoque interno' },
                ...(lookups?.colaboradores.map((item) => ({ value: String(item.id), label: item.nome })) ?? []),
              ]}
              label="Novo responsavel"
              onChange={setTransferResponsavel}
              placeholder="Selecione um colaborador"
              value={transferResponsavel}
            />
            <Group justify="flex-end">
              <AppButton color="gray" motionDisabled onClick={() => setTransferOpened(false)} type="button" variant="subtle">
                Cancelar
              </AppButton>
              <AppButton loading={isTransferring} type="submit">
                Confirmar transferencia
              </AppButton>
            </Group>
          </Stack>
        </form>
      </AppModal>

      <AppModal onClose={() => setCategoryOpened(false)} opened={categoryOpened} size="lg" title="Alterar categoria em lote">
        <form onSubmit={handleBulkCategorySubmit}>
          <Stack gap="lg">
            <Select
              data={lookups?.categorias.map((item) => ({ value: String(item.id), label: item.nome })) ?? []}
              label="Nova categoria"
              onChange={setBulkCategoria}
              placeholder="Selecione a categoria"
              required
              value={bulkCategoria}
            />
            <Group justify="flex-end">
              <AppButton color="gray" motionDisabled onClick={() => setCategoryOpened(false)} type="button" variant="subtle">
                Cancelar
              </AppButton>
              <AppButton type="submit">Alterar categoria</AppButton>
            </Group>
          </Stack>
        </form>
      </AppModal>

      <AppModal onClose={() => setImportOpened(false)} opened={importOpened} size="lg" title="Importar equipamentos por CSV">
        <form onSubmit={handleImportSubmit}>
          <Stack gap="lg">
            <Text c="dimmed" size="sm">
              Use o modelo CSV padronizado para cadastrar grandes volumes sem perder consistência de categoria, patrimônio e status.
            </Text>
            <FileInput accept=".csv" label="Arquivo CSV" onChange={setImportFile} placeholder="Selecione o arquivo de importação" required value={importFile} />
            <Group justify="flex-end">
              <AppButton color="gray" motionDisabled onClick={() => setImportOpened(false)} type="button" variant="subtle">
                Cancelar
              </AppButton>
              <AppButton loading={isImporting} type="submit">
                Importar arquivo
              </AppButton>
            </Group>
          </Stack>
        </form>
      </AppModal>
    </>
  )
}
