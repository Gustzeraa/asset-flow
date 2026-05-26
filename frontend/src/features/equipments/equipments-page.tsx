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
import { apiFetch, getApiErrorMessage, downloadFile } from '@/lib/api'
import { appFeedback } from '@/lib/feedback'
import { formatDate, formatNullable } from '@/lib/format'
import { actionIcons, screenIcons, sectionIcons } from '@/lib/app-icons'
import type { Equipment, Category, Collaborator } from '@/types/domain'

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
  imagens: []
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
    imagens: [],
  }
}

export function EquipmentsPage() {
  const { lookups, refreshLookups } = useLookups()
  
  // Ícones
  const SearchIcon = actionIcons.search
  const AddIcon = actionIcons.add
  const EditIcon = actionIcons.edit
  const DeleteIcon = actionIcons.delete
  const DownloadIcon = actionIcons.download
  const UploadIcon = actionIcons.upload
  const TransferIcon = actionIcons.transfer
  const ViewIcon = actionIcons.view 
  
  const EquipmentIcon = screenIcons.equipments
  const CategoryIcon = screenIcons.categories
  const ActiveIcon = sectionIcons.active
  const AvailableIcon = sectionIcons.available
  const InUseIcon = sectionIcons.inUse
  const MaintenanceIcon = sectionIcons.maintenance
  
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
  const [viewingEquipment, setViewingEquipment] = useState<Equipment | null>(null)
  
  // Quick Categoria
  const [quickCategoryOpened, setQuickCategoryOpened] = useState(false)
  const [quickCategoryName, setQuickCategoryName] = useState('')
  const [isSavingQuickCategory, setIsSavingQuickCategory] = useState(false)

  // Quick Colaborador
  const [quickCollabOpened, setQuickCollabOpened] = useState(false)
  const [quickCollabTarget, setQuickCollabTarget] = useState<'responsavel' | 'validador' | null>(null)
  const [quickCollabForm, setQuickCollabForm] = useState({ nome: '', cargo: '', email: '', departamento_id: '' })
  const [isSavingQuickCollab, setIsSavingQuickCollab] = useState(false)

  async function handleQuickCreateCategory(event: React.FormEvent) {
    event.preventDefault()
    if (!quickCategoryName.trim()) return

    setIsSavingQuickCategory(true)
    try {
      const response = await apiFetch<{ item: Category }>('/api/categories/', {
        method: 'POST',
        body: JSON.stringify({ nome: quickCategoryName }),
      })
      appFeedback.success({ 
        title: 'Categoria criada',
        message: `A categoria "${response.item.nome}" foi criada com sucesso.`
      })
      await refreshLookups()
      updateForm('categoria', String(response.item.id))
      setQuickCategoryOpened(false)
      setQuickCategoryName('')
    } catch (error) {
      appFeedback.error({ title: 'Erro ao criar categoria', message: getApiErrorMessage(error) })
    } finally {
      setIsSavingQuickCategory(false)
    }
  }

  async function handleQuickCreateCollaborator(event: React.FormEvent) {
    event.preventDefault()
    setIsSavingQuickCollab(true)

    try {
      const payload = {
        ...quickCollabForm,
        departamento_id: parseInt(quickCollabForm.departamento_id, 10),
        cpf: null, // Deixamos vazio na criação rápida
        ativo: true
      }
      
      const response = await apiFetch<{ item: Collaborator }>('/api/collaborators/', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      
      appFeedback.success({ 
        title: 'Colaborador criado com sucesso',
        message: `O colaborador "${response.item.nome}" foi criado com sucesso.`
      })
      await refreshLookups()
      
      if (quickCollabTarget) {
        updateForm(quickCollabTarget, String(response.item.id))
      }
      
      setQuickCollabOpened(false)
      setQuickCollabForm({ nome: '', cargo: '', email: '', departamento_id: '' })
    } catch (error) {
      appFeedback.error({ title: 'Erro ao criar colaborador', message: getApiErrorMessage(error) })
    } finally {
      setIsSavingQuickCollab(false)
    }
  }

  function openQuickCollab(target: 'responsavel' | 'validador') {
    setQuickCollabTarget(target)
    setQuickCollabForm({ nome: '', cargo: '', email: '', departamento_id: '' })
    setQuickCollabOpened(true)
  }
  // ============================================================================

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
      imagens: [],
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

    const formData = new FormData()
    formData.append('data', form.data)
    formData.append('nome', form.nome)
    formData.append('num_patrimonio', form.num_patrimonio)
    formData.append('categoria', form.categoria)
    formData.append('local', form.local)
    formData.append('tipo', form.tipo)
    formData.append('departamento', form.departamento)
    formData.append('descricao', form.descricao)
    formData.append('status', form.status)
    formData.append('responsavel', form.responsavel)
    formData.append('validador', form.validador)
    formData.append('observacao', form.observacao)
    
    const imagensArray = Array.isArray(form.imagens) 
      ? form.imagens 
      : (form.imagens ? [form.imagens as unknown as File] : [])

    if (imagensArray.length > 0) {
      formData.append('foto', imagensArray[0])
      const fotosGaleria = imagensArray.slice(1, 5)
      fotosGaleria.forEach((file) => {
        formData.append('galeria', file)
      })
    }

    try {
      if (editing) {
        await apiFetch(`/api/equipments/${editing.id}/`, {
          method: 'POST',
          body: formData,
        })
      } else {
        await apiFetch('/api/equipments/', {
          method: 'POST',
          body: formData,
        })
      }

      appFeedback.success({
        title: editing ? 'Equipamento atualizado' : 'Equipamento criado',
        message: 'O inventario foi sincronizado com sucesso.',
      })
      setOpened(false)
      await reload()
    } catch (error) {
      appFeedback.error({
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

      appFeedback.success({
        title: 'Transferencia concluida',
        message: transferTarget ? 'O equipamento foi transferido.' : 'Os equipamentos selecionados foram transferidos.',
      })
      setTransferOpened(false)
      await reload()
    } catch (error) {
      appFeedback.error({
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
      appFeedback.success({
        title: 'Categoria atualizada',
        message: 'Os equipamentos selecionados receberam a nova categoria.',
      })
      setCategoryOpened(false)
      await reload()
    } catch (error) {
      appFeedback.error({
        title: 'Falha ao alterar categoria',
        message: getApiErrorMessage(error),
      })
    }
  }

  async function handleImportSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!importFile) return

    setIsImporting(true)
    const formData = new FormData()
    formData.append('file', importFile)

    try {
      const response = await apiFetch<{ detail: string; successes: number; errors: string[] }>('/api/equipments/import/', {
        method: 'POST',
        body: formData,
      })
      ;(response.errors.length ? appFeedback.warning : appFeedback.success)({
        title: 'Importacao concluida',
        message: `${response.successes} item(ns) importado(s). ${response.errors.length ? `${response.errors.length} erro(s) detectado(s).` : ''}`,
      })
      setImportOpened(false)
      setImportFile(null)
      await Promise.all([reload(), refreshLookups()])
    } catch (error) {
      appFeedback.error({
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
          await apiFetch(`/api/equipments/${item.id}/trash/`, { method: 'POST' })
          appFeedback.success({ title: 'Equipamento movido', message: 'O equipamento foi enviado para a lixeira.' })
          await reload()
        } catch (error) {
          appFeedback.error({ title: 'Falha ao mover equipamento', message: getApiErrorMessage(error) })
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
            body: JSON.stringify({ ids: Array.from(selectedIds) }),
          })
          appFeedback.success({ title: 'Lote movido', message: 'Os equipamentos selecionados foram enviados para a lixeira.' })
          await reload()
        } catch (error) {
          appFeedback.error({ title: 'Falha ao mover lote', message: getApiErrorMessage(error) })
        }
      },
    })
  }

  if (isLoading && !data) {
    return <LoadingPanel label="Carregando equipamentos..." />
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

  async function handleDownloadTemplate() {
    try {
      await downloadFile('/api/equipments/import/template/', 'modelo_importacao.csv')
    } catch (error) {
      appFeedback.error({ title: 'Erro ao baixar modelo', message: getApiErrorMessage(error) })
    }
  }

  async function handleExport() {
    try {
      await downloadFile(`/api/equipments/export/${query ? `?${query}` : ''}`, 'exportacao_equipamentos.csv')
    } catch (error) {
      appFeedback.error({ title: 'Erro ao exportar', message: getApiErrorMessage(error) })
    }
  }

  return (
    <>
      <Stack gap="lg">
        <PageHeader
          actions={
            <Group>
              <AppButton onClick={handleDownloadTemplate} leftSection={<DownloadIcon size={14} />} variant="light">
                Baixar modelo
              </AppButton>
              
              <AppButton onClick={handleExport} leftSection={<DownloadIcon size={14} />} variant="light">
                Exportar CSV
              </AppButton>
              
              <AppButton leftSection={<UploadIcon size={14} />} onClick={() => setImportOpened(true)} variant="light">
                Importar CSV
              </AppButton>
              <AppButton leftSection={<AddIcon size={14} />} onClick={openCreate}>
                Novo equipamento
              </AppButton>
            </Group>
          }
          description="Controle patrimonial com filtros objetivos, ações em lote e formulários claros para operação diária."
          icon={<EquipmentIcon size={18} />}
          title="Gestao de equipamentos"
        />

        <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md">
          <MetricCard description="Base visível no inventário atual." icon={<ActiveIcon size={18} />} title="Total filtrado" value={data.summary.total} />
          <MetricCard description="Prontos para uso ou redistribuição." icon={<AvailableIcon size={18} />} title="Disponiveis" value={data.summary.disponiveis} />
          <MetricCard description="Vinculados a colaboradores." icon={<InUseIcon size={18} />} title="Em uso" value={data.summary.em_uso} />
          <MetricCard description="Itens em análise ou reparo." icon={<MaintenanceIcon size={18} />} title="Manutencao" value={data.summary.manutencao} />
        </SimpleGrid>

        <AppCard>
          <SimpleGrid cols={{ base: 1, md: 2, xl: 5 }} spacing="sm">
            <TextInput
              leftSection={<SearchIcon size={14} />}
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
              label="Ordenação"
              onChange={setOrdenacao}
              placeholder="Padrao"
              value={ordenacao}
            />
            <TextInput label="Data inicial" onChange={(event) => setDataInicio(event.currentTarget.value)} type="date" value={dataInicio} />
            <TextInput label="Data final" onChange={(event) => setDataFim(event.currentTarget.value)} type="date" value={dataFim} />
          </SimpleGrid>
        </AppCard>

        {selectedIds.size > 0 ? (
          <AppCard className="border-brand-200/80 bg-brand-0/66 shadow-none">
            <Group justify="space-between" wrap="wrap">
              <Stack gap={2}>
                <Text fw={800}>{selectedIds.size} equipamento(s) selecionado(s)</Text>
                <Text c="dimmed" size="sm">
                  Execute ações em lote mantendo o fluxo do inventário consistente.
                </Text>
              </Stack>
              <Group>
                <AppButton color="dark" leftSection={<TransferIcon size={14} />} onClick={openBulkTransfer} variant="light">
                  Transferir lote
                </AppButton>
                <AppButton color="dark" leftSection={<CategoryIcon size={14} />} onClick={() => setCategoryOpened(true)} variant="light">
                  Alterar categoria
                </AppButton>
                <AppButton color="red" leftSection={<DeleteIcon size={14} />} onClick={handleBulkTrash} variant="light">
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
                        <EquipmentIcon size={18} />
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
                render: (item) => <StatusBadge label={item.status_label || item.status} value={item.status} />,
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
                    <ActionIcon color="blue" onClick={() => setViewingEquipment(item)} radius="xl" variant="light" title="Visualizar detalhes">
                      <ViewIcon size={15} />
                    </ActionIcon>
                    <ActionIcon color="teal" onClick={() => openSingleTransfer(item)} radius="xl" variant="light" title="Transferir equipamento">
                      <TransferIcon size={15} />
                    </ActionIcon>
                    <ActionIcon color="brand" onClick={() => openEdit(item)} radius="xl" variant="light" title="Editar">
                      <EditIcon size={15} />
                    </ActionIcon>
                    <ActionIcon color="red" onClick={() => handleTrash(item)} radius="xl" variant="light" title="Excluir">
                      <DeleteIcon size={15} />
                    </ActionIcon>
                  </Group>
                ),
              },
            ]}
            emptyDescription="Cadastre o parque de equipamentos para acompanhar patrimônio, responsáveis, status e movimentações."
            emptyIcon={<EquipmentIcon size={18} />}
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
              
              {/* SELECT DE CATEGORIA COM BOTÃO NOVO */}
                <Select
                data={lookups?.categorias.map((item) => ({ value: String(item.id), label: item.nome })) ?? []}
                label="Categoria"
                onChange={(value) => updateForm('categoria', value ?? '')}
                required
                searchable
                value={form.categoria}
                rightSectionPointerEvents="auto" // NOVO: Libera o clique no ícone
                rightSection={
                  <ActionIcon 
                    size="sm" 
                    variant="light" 
                    color="brand" 
                    onMouseDown={(e) => e.stopPropagation()} // NOVO: Evita abrir o Select
                    onClick={(e) => {
                      e.stopPropagation() // NOVO: Garante que só o modal abra
                      setQuickCategoryOpened(true)
                    }} 
                    title="Nova categoria"
                  >
                    <AddIcon size={14} />
                  </ActionIcon>
                }
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
              
              {/* SELECT DE RESPONSÁVEL COM BOTÃO NOVO */}
              <Select
                clearable
                searchable
                data={lookups?.colaboradores.map((item) => ({ value: String(item.id), label: item.nome })) ?? []}
                label="Responsavel"
                onChange={(value) => updateForm('responsavel', value ?? '')}
                placeholder="Sem responsavel"
                value={form.responsavel}
                rightSectionPointerEvents="auto" // NOVO: Libera o clique no ícone
                rightSection={
                  <ActionIcon 
                    size="sm" 
                    variant="light" 
                    color="brand" 
                    onMouseDown={(e) => e.stopPropagation()} // NOVO
                    onClick={(e) => {
                      e.stopPropagation() // NOVO
                      openQuickCollab('responsavel')
                    }} 
                    title="Novo colaborador"
                  >
                    <AddIcon size={14} />
                  </ActionIcon>
                }
              />
              
              {/* SELECT DE VALIDADOR COM BOTÃO NOVO */}
              <Select
                clearable
                searchable
                data={lookups?.colaboradores.map((item) => ({ value: String(item.id), label: item.nome })) ?? []}
                label="Validador"
                onChange={(value) => updateForm('validador', value ?? '')}
                placeholder="Sem validador"
                value={form.validador}
                rightSectionPointerEvents="auto" // NOVO: Libera o clique no ícone
                rightSection={
                  <ActionIcon 
                    size="sm" 
                    variant="light" 
                    color="brand" 
                    onMouseDown={(e) => e.stopPropagation()} // NOVO
                    onClick={(e) => {
                      e.stopPropagation() // NOVO
                      openQuickCollab('validador')
                    }} 
                    title="Novo validador"
                  >
                    <AddIcon size={14} />
                  </ActionIcon>
                }
              />
            </SimpleGrid>
            <Textarea autosize label="Descricao" minRows={3} onChange={(event) => updateForm('descricao', event.currentTarget.value)} value={form.descricao} />
            <Textarea autosize label="Observacao" minRows={3} onChange={(event) => updateForm('observacao', event.currentTarget.value)} value={form.observacao} />
            <FileInput
              accept="image/*"
              label="Fotos do Equipamento"
              description="A primeira foto selecionada será usada como capa. Você pode selecionar até 5 fotos no total."
              multiple
              clearable
              onChange={(payload: any) => updateForm('imagens', payload || [])}
              placeholder="Clique para selecionar as imagens..."
              value={form.imagens} 
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

      <AppModal opened={quickCategoryOpened} onClose={() => setQuickCategoryOpened(false)} title="Nova Categoria Rápida" size="sm">
        <form onSubmit={handleQuickCreateCategory}>
          <Stack gap="md">
            <TextInput
              label="Nome da categoria"
              placeholder="Ex: Notebooks, Periféricos..."
              required
              data-autofocus
              value={quickCategoryName}
              onChange={(e) => setQuickCategoryName(e.currentTarget.value)}
            />
            <Group justify="flex-end">
              <AppButton variant="subtle" color="gray" onClick={() => setQuickCategoryOpened(false)} type="button">Cancelar</AppButton>
              <AppButton type="submit" loading={isSavingQuickCategory}>Salvar</AppButton>
            </Group>
          </Stack>
        </form>
      </AppModal>

      <AppModal opened={quickCollabOpened} onClose={() => setQuickCollabOpened(false)} title="Novo Colaborador Rápido" size="md">
        <form onSubmit={handleQuickCreateCollaborator}>
          <Stack gap="md">
            <TextInput
              label="Nome completo"
              required
              data-autofocus
              value={quickCollabForm.nome}
              onChange={(e) => setQuickCollabForm({ ...quickCollabForm, nome: e.currentTarget.value })}
            />
            <TextInput
              label="Cargo"
              required
              value={quickCollabForm.cargo}
              onChange={(e) => setQuickCollabForm({ ...quickCollabForm, cargo: e.currentTarget.value })}
            />
            <TextInput
              label="Email"
              type="email"
              required
              value={quickCollabForm.email}
              onChange={(e) => setQuickCollabForm({ ...quickCollabForm, email: e.currentTarget.value })}
            />
            <Select
              label="Departamento"
              required
              searchable
              data={lookups?.departamentos?.map((d) => ({ value: String(d.id), label: d.nome })) ?? []}
              value={quickCollabForm.departamento_id}
              onChange={(v) => setQuickCollabForm({ ...quickCollabForm, departamento_id: v ?? '' })}
              placeholder="Selecione o departamento..."
            />
            <Group justify="flex-end">
              <AppButton variant="subtle" color="gray" onClick={() => setQuickCollabOpened(false)} type="button">Cancelar</AppButton>
              <AppButton type="submit" loading={isSavingQuickCollab}>Salvar</AppButton>
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

      <AppModal 
        onClose={() => setViewingEquipment(null)} 
        opened={!!viewingEquipment} 
        size="lg" 
        title="Detalhes do Equipamento"
      >
        {viewingEquipment && (
          <Stack gap="xl">
            <Group wrap="nowrap" align="flex-start" gap="md">
              {viewingEquipment.foto_url ? (
                <Image 
                  alt={viewingEquipment.nome} 
                  className="rounded-xl border border-slate-200" 
                  h={100} 
                  src={viewingEquipment.foto_url} 
                  w={100} 
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div className="flex shrink-0 h-[100px] w-[100px] items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  <EquipmentIcon size={40} />
                </div>
              )}
              
              <Stack gap="xs" style={{ flex: 1 }}>
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Text size="xl" fw={700}>{viewingEquipment.nome}</Text>
                    <Text c="dimmed" size="sm">Patrimônio: {viewingEquipment.num_patrimonio}</Text>
                  </div>
                  <StatusBadge 
                    label={(viewingEquipment as any).status_label || viewingEquipment.status} 
                    value={viewingEquipment.status} 
                  />
                </Group>
              </Stack>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <Stack gap={0}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">Categoria</Text>
                <Text fw={500}>{viewingEquipment.categoria?.nome || 'Sem categoria'}</Text>
              </Stack>
              
              <Stack gap={0}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">Tipo</Text>
                <Text fw={500}>{formatNullable(viewingEquipment.tipo)}</Text>
              </Stack>

              <Stack gap={0}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">Departamento</Text>
                <Text fw={500}>{formatNullable(viewingEquipment.departamento)}</Text>
              </Stack>

              <Stack gap={0}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">Local</Text>
                <Text fw={500}>{formatNullable(viewingEquipment.local)}</Text>
              </Stack>

              <Stack gap={0}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">Responsável Atual</Text>
                <Text fw={500}>{viewingEquipment.responsavel?.nome || 'Estoque Interno'}</Text>
              </Stack>

              <Stack gap={0}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">Data de Registro</Text>
                <Text fw={500}>{formatDate(viewingEquipment.data)}</Text>
              </Stack>
            </SimpleGrid>

            <Stack gap="sm">
              <Stack gap={0}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">Descrição Técnica</Text>
                <Text style={{ whiteSpace: 'pre-wrap' }}>
                  {viewingEquipment.descricao || 'Nenhuma descrição detalhada informada.'}
                </Text>
              </Stack>

              <Stack gap={0} mt="sm">
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">Observações</Text>
                <Text style={{ whiteSpace: 'pre-wrap' }}>
                  {viewingEquipment.observacao || 'Sem observações adicionais.'}
                </Text>
              </Stack>

              {(viewingEquipment as any)?.galeria?.length > 0 && (
                <Stack gap={0} mt="sm">
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb="xs">Galeria de Imagens</Text>
                  <Group gap="sm">
                    {(viewingEquipment as any).galeria.map((url: string, index: number) => (
                      <Image 
                        key={index} 
                        src={url} 
                        h={80} 
                        w={80} 
                        radius="md" 
                        className="border border-slate-200"
                        style={{ objectFit: 'cover', cursor: 'pointer' }} 
                        onClick={() => window.open(url, '_blank')}
                        title="Clique para ampliar"
                      />
                    ))}
                  </Group>
                </Stack>
              )}
            </Stack>

            <Group justify="flex-end" mt="md">
              <AppButton color="gray" onClick={() => setViewingEquipment(null)} variant="subtle">
                Fechar
              </AppButton>
            </Group>
          </Stack>
        )}
      </AppModal>
    </>
  )
}