import { useDeferredValue, useMemo, useState } from 'react'

import {
  ActionIcon,
  Avatar,
  Badge,
  Checkbox,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'

import { useLookups } from '@/app/lookups-context'
import { LoadingPanel } from '@/components/feedback/loading-panel'
import { AppCard } from '@/components/ui/app-card'
import { AppButton } from '@/components/ui/app-button'
import { AppModal } from '@/components/ui/app-modal'
import { DataTable } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'
import { useAsyncData } from '@/hooks/use-async-data'
import { apiFetch, getApiErrorMessage } from '@/lib/api'
import { appFeedback } from '@/lib/feedback'
import { actionIcons, screenIcons } from '@/lib/app-icons'
import type { Equipment } from '@/types/domain'

type EquipmentListResponse = {
  items: Equipment[]
  summary: any
}

type FinanceFormState = {
  centro_de_custo_id: string
  data_compra: string
  valor_compra: string
  taxa_depreciacao_anual: string
}

export function ControleContabilPage() {
  const { lookups } = useLookups()

  // Ícones
  const SearchIcon = actionIcons.search
  const EditIcon = actionIcons.edit
  const FinanceIcon = screenIcons.dashboard
  const BulkIcon = actionIcons.edit
  const ExportIcon = actionIcons.download || actionIcons.search // Ícone para a exportação

  // ==========================================
  // ESTADOS DOS FILTROS
  // ==========================================
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [centroCustoFiltro, setCentroCustoFiltro] = useState<string | null>(null)
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null)
  const [dataInicial, setDataInicial] = useState('')
  const [dataFinal, setDataFinal] = useState('')

  // ==========================================
  // ESTADOS DE SELEÇÃO E AÇÕES EM LOTE
  // ==========================================
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [bulkModalOpened, setBulkModalOpened] = useState(false)
  const [bulkCentroCusto, setBulkCentroCusto] = useState<string>('')
  const [isBulkSaving, setIsBulkSaving] = useState(false)

  // ==========================================
  // ESTADOS DE EDIÇÃO INDIVIDUAL
  // ==========================================
  const [opened, setOpened] = useState(false)
  const [editing, setEditing] = useState<Equipment | null>(null)
  const [form, setForm] = useState<FinanceFormState>({
    centro_de_custo_id: '',
    data_compra: '',
    valor_compra: '',
    taxa_depreciacao_anual: '10',
  })
  const [isSaving, setIsSaving] = useState(false)

  // ==========================================
  // ESTADOS DA EXPORTAÇÃO
  // ==========================================
  const [exportModalOpened, setExportModalOpened] = useState(false)
  const [exportAno, setExportAno] = useState<string>('')
  const [exportCentroCusto, setExportCentroCusto] = useState<string>('')

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (deferredSearch) params.set('search', deferredSearch)
    if (centroCustoFiltro) params.set('centro_custo', centroCustoFiltro)
    if (categoriaFiltro) params.set('categoria', categoriaFiltro)
    if (dataInicial) params.set('data_inicial', dataInicial)
    if (dataFinal) params.set('data_final', dataFinal)
    params.set('ordering', '-valor_compra')
    return params.toString()
  }, [deferredSearch, centroCustoFiltro, categoriaFiltro, dataInicial, dataFinal])

  const { data, error, isLoading, reload } = useAsyncData(
    () => apiFetch<EquipmentListResponse>(`/api/equipments/${query ? `?${query}` : ''}`),
    [query],
  )

  const items = useMemo(() => data?.items ?? [], [data?.items])

  // Lógica de Checkboxes
  const toggleRow = (id: number) =>
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  const toggleAll = () =>
    setSelectedIds((current) => (current.length === items.length ? [] : items.map((i) => i.id)))

  function updateForm<Key extends keyof FinanceFormState>(key: Key, value: FinanceFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function openEditFinance(item: Equipment) {
    setEditing(item)
    setForm({
      centro_de_custo_id: item.centro_de_custo_id ? String(item.centro_de_custo_id) : '',
      data_compra: item.data_compra?.slice(0, 10) ?? '',
      valor_compra: item.valor_compra && item.valor_compra !== '0.00' ? item.valor_compra : '',
      taxa_depreciacao_anual: item.taxa_depreciacao_anual ?? '10',
    })
    setOpened(true)
  }

  async function handleIndividualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    setIsSaving(true)
    try {
      await apiFetch(`/api/equipments/${editing.id}/finance/`, {
        method: 'POST',
        body: JSON.stringify(form),
      })
      appFeedback.success({ title: 'Conciliação salva', message: 'Dados financeiros atualizados.' })
      setOpened(false)
      await reload()
    } catch (error) {
      appFeedback.error({ title: 'Falha ao salvar', message: getApiErrorMessage(error) })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleBulkSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsBulkSaving(true)
    try {
      await apiFetch(`/api/equipments/bulk/finance/`, {
        method: 'POST',
        body: JSON.stringify({
          ids: selectedIds,
          centro_de_custo_id: bulkCentroCusto || null,
        }),
      })
      appFeedback.success({ title: 'Lote atualizado', message: `${selectedIds.length} equipamentos atualizados.` })
      setBulkModalOpened(false)
      setSelectedIds([])
      await reload()
    } catch (error) {
      appFeedback.error({ title: 'Falha na ação em lote', message: getApiErrorMessage(error) })
    } finally {
      setIsBulkSaving(false)
    }
  }

  const formatarDinheiro = (valor: string | number | null | undefined) => {
    if (!valor || valor === '0.00' || valor === 0) return "-"
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor))
  }

  const formatarData = (dataIso: string | null) => {
    if (!dataIso) return "-"
    const [ano, mes, dia] = dataIso.split('-')
    return `${dia}/${mes}/${ano}`
  }

  if (isLoading && !data) return <LoadingPanel label="Carregando balanço patrimonial..." />
  if (!data) return <LoadingPanel label={error ?? 'Erro ao carregar os dados'} />

  return (
    <>
      <Stack gap="lg">
        <PageHeader
          description="Conciliação contábil, valorização de ativos e vínculo de centros de custo."
          icon={<FinanceIcon size={18} />}
          title="Controle Contábil de Ativos"
        />

        {/* ========================================== */}
        {/* BOTÃO DE EXPORTAÇÃO                        */}
        {/* ========================================== */}
        <Group justify="flex-end">
          <AppButton 
            leftSection={<ExportIcon size={16} />} 
            color="green" 
            onClick={() => setExportModalOpened(true)}
          >
            Exportar Fechamento
          </AppButton>
        </Group>

        {/* ========================================== */}
        {/* BARRA DE FILTROS COMPLETOS                 */}
        {/* ========================================== */}
        <AppCard>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="sm">
            <TextInput
              leftSection={<SearchIcon size={14} />}
              label="Buscar Ativo"
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Patrimônio ou nome..."
              value={search}
            />
            <Select
              clearable
              data={lookups?.categorias?.map((item) => ({ value: String(item.id), label: item.nome })) ?? []}
              label="Categoria"
              onChange={setCategoriaFiltro}
              placeholder="Todas"
              value={categoriaFiltro}
            />
            <Select
              clearable
              data={lookups?.centros_custo?.map((item) => ({ value: String(item.id), label: `${item.codigo} - ${item.nome}` })) ?? []}
              label="Centro de Custo"
              onChange={setCentroCustoFiltro}
              placeholder="Todos os centros"
              value={centroCustoFiltro}
            />
            <TextInput
              label="Compra A partir de"
              type="date"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.currentTarget.value)}
            />
            <TextInput
              label="Compra Até"
              type="date"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.currentTarget.value)}
            />
          </SimpleGrid>
        </AppCard>

        {/* ========================================== */}
        {/* BARRA DE AÇÕES EM LOTE (Visível se selecionado) */}
        {/* ========================================== */}
        {selectedIds.length > 0 && (
          <Group className="bg-brand-50 border border-brand-200 px-4 py-3 rounded-lg" justify="space-between">
            <Text fw={600} className="text-brand-700">
              {selectedIds.length} ativos selecionados
            </Text>
            <Group>
              <AppButton size="sm" variant="outline" onClick={() => setSelectedIds([])}>
                Cancelar seleção
              </AppButton>
              <AppButton size="sm" leftSection={<BulkIcon size={14}/>} onClick={() => setBulkModalOpened(true)}>
                Alterar Centro de Custo em Lote
              </AppButton>
            </Group>
          </Group>
        )}

        <AppCard>
          <DataTable<Equipment>
            columns={[
              {
                key: 'selecao',
                label: (
                  <Checkbox
                    checked={items.length > 0 && selectedIds.length === items.length}
                    indeterminate={selectedIds.length > 0 && selectedIds.length < items.length}
                    onChange={toggleAll}
                  />
                ),
                width: 40,
                render: (item) => (
                  <Checkbox
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleRow(item.id)}
                  />
                ),
              },
              {
                key: 'patrimonio',
                label: 'Identificação',
                width: 280, // Aumentei um pouco a largura para caber a foto
                render: (item) => (
                  <Group wrap="nowrap" gap="sm">
                    <Avatar 
                      src={item.foto_url} 
                      radius="md" 
                      size={42} 
                      color="brand"
                    >
                      {/* Se não tiver foto, ele mostra a primeira letra do nome do equipamento */}
                      {item.nome.charAt(0).toUpperCase()}
                    </Avatar>
                    
                    <Stack gap={0} className="min-w-0 flex-1">
                      <Text fw={700} className="truncate">{item.num_patrimonio}</Text>
                      <Text c="dimmed" size="xs" className="truncate">{item.nome}</Text>
                    </Stack>
                  </Group>
                ),
              },
              {
                key: 'centro_custo',
                label: 'Centro de Custo',
                width: 180,
                render: (item) => (
                  item.centro_de_custo ? (
                    <Badge color="blue" variant="light">
                      {item.centro_de_custo.codigo}
                    </Badge>
                  ) : (
                    <Text size="xs" c="red" fw={600}>Pendente</Text>
                  )
                ),
              },
              {
                key: 'data_compra',
                label: 'Data Aquisição',
                width: 120,
                render: (item) => <Text size="sm">{formatarData(item.data_compra)}</Text>,
              },
              {
                key: 'valor_compra',
                label: 'Valor Original',
                width: 150,
                render: (item) => <Text size="sm" fw={600}>{formatarDinheiro(item.valor_compra)}</Text>,
              },
              {
                key: 'valor_contabil',
                label: 'Valor Contábil (Hoje)',
                width: 150,
                render: (item) => {
                  const original = Number(item.valor_compra) || 0
                  const atual = Number(item.valor_atual_contabil) || 0
                  const depreciado = original - atual

                  return (
                    <Stack gap={0}>
                      {/* O valor atual do bem */}
                      <Text size="sm" fw={700} c={atual > 0 && atual < original ? 'green.7' : 'dark'}>
                        {formatarDinheiro(atual)}
                      </Text>
                      
                      {/* Subtítulo vermelho mostrando quanto já perdeu de valor */}
                      {depreciado > 0 && (
                        <Text size="xs" c="red.6" fw={500} title="Valor depreciado">
                          - {formatarDinheiro(depreciado)}
                        </Text>
                      )}
                    </Stack>
                  )
                },
              },
              {
                key: 'acoes',
                label: 'Ação',
                width: 80,
                render: (item) => (
                  <ActionIcon color="brand" onClick={() => openEditFinance(item)} radius="xl" variant="light" title="Conciliação Financeira">
                    <EditIcon size={15} />
                  </ActionIcon>
                ),
              },
            ]}
            emptyDescription="Nenhum ativo encontrado para essa busca."
            emptyIcon={<FinanceIcon size={18} />}
            emptyTitle="Sem resultados"
            items={items}
            keyExtractor={(item) => item.id}
            minWidth={900}
            rowId={(item) => item.id}
          />
        </AppCard>
      </Stack>

      {/* ========================================== */}
      {/* MODAL DE EDIÇÃO INDIVIDUAL                 */}
      {/* ========================================== */}
      <AppModal onClose={() => setOpened(false)} opened={opened} size="md" title="Conciliação Contábil do Ativo">
        <form onSubmit={handleIndividualSubmit}>
          <Stack gap="lg">
            {editing && (
              <AppCard className="bg-slate-50 border-slate-200 p-3 shadow-none">
                <Text size="sm" fw={700}>{editing.nome}</Text>
                <Text size="xs" c="dimmed">Patrimônio: {editing.num_patrimonio}</Text>
              </AppCard>
            )}

            <Select
              label="Centro de Custo (Setor Pagante)"
              placeholder="Selecione o centro de custo"
              data={lookups?.centros_custo?.map((c) => ({ value: String(c.id), label: `${c.codigo} - ${c.nome}` })) ?? []}
              value={form.centro_de_custo_id}
              onChange={(value) => updateForm('centro_de_custo_id', value ?? '')}
              searchable
              clearable
            />
            {/* O restante dos inputs continua igual (data, valor, taxa) */}
            <SimpleGrid cols={2}>
              <TextInput label="Data da Nota Fiscal" type="date" value={form.data_compra} onChange={(e) => updateForm('data_compra', e.currentTarget.value)} />
              <TextInput label="Valor de Compra (R$)" type="number" step="0.01" value={form.valor_compra} onChange={(e) => updateForm('valor_compra', e.currentTarget.value)} />
            </SimpleGrid>
            <TextInput label="Taxa de Depreciação (% ao ano)" type="number" step="0.1" value={form.taxa_depreciacao_anual} onChange={(e) => updateForm('taxa_depreciacao_anual', e.currentTarget.value)} />

            <Group justify="flex-end" mt="md">
              <AppButton color="gray" motionDisabled onClick={() => setOpened(false)} type="button" variant="subtle">Cancelar</AppButton>
              <AppButton loading={isSaving} type="submit">Salvar Valores</AppButton>
            </Group>
          </Stack>
        </form>
      </AppModal>

      {/* ========================================== */}
      {/* MODAL DE AÇÃO EM LOTE                      */}
      {/* ========================================== */}
      <AppModal onClose={() => setBulkModalOpened(false)} opened={bulkModalOpened} size="sm" title="Atribuir Centro de Custo em Lote">
        <form onSubmit={handleBulkSubmit}>
          <Stack gap="md">
            <Text size="sm">Você está atualizando <b>{selectedIds.length} equipamentos</b>.</Text>
            
            <Select
              label="Novo Centro de Custo"
              description="Deixe em branco se quiser remover os equipamentos do centro de custo atual."
              placeholder="Selecione para vincular..."
              data={lookups?.centros_custo?.map((c) => ({ value: String(c.id), label: `${c.codigo} - ${c.nome}` })) ?? []}
              value={bulkCentroCusto}
              onChange={(value) => setBulkCentroCusto(value ?? '')}
              searchable
              clearable
            />

            <Group justify="flex-end" mt="md">
              <AppButton color="gray" onClick={() => setBulkModalOpened(false)} type="button" variant="subtle">Cancelar</AppButton>
              <AppButton loading={isBulkSaving} type="submit">Aplicar Lote</AppButton>
            </Group>
          </Stack>
        </form>
      </AppModal>

      {/* ========================================== */}
      {/* MODAL DE EXPORTAÇÃO CONTÁBIL               */}
      {/* ========================================== */}
      <AppModal onClose={() => setExportModalOpened(false)} opened={exportModalOpened} size="sm" title="Exportar Fechamento Contábil">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Gere uma planilha Excel (.csv) contendo o cálculo de depreciação e valorização dos ativos.
          </Text>

          <Select
            label="Ano de Aquisição (Opcional)"
            placeholder="Todos os anos"
            data={['2022', '2023', '2024', '2025', '2026', '2027']}
            value={exportAno}
            onChange={(val) => setExportAno(val ?? '')}
            clearable
          />

          <Select
            label="Centro de Custo (Opcional)"
            placeholder="Todos os centros"
            data={lookups?.centros_custo?.map((c) => ({ value: String(c.id), label: `${c.codigo} - ${c.nome}` })) ?? []}
            value={exportCentroCusto}
            onChange={(val) => setExportCentroCusto(val ?? '')}
            clearable
            searchable
          />

          <Group justify="flex-end" mt="md">
            <AppButton color="gray" onClick={() => setExportModalOpened(false)} variant="subtle">
              Cancelar
            </AppButton>
            <AppButton 
              color="green"
              onClick={() => {
                // Monta a URL com os filtros e abre numa nova aba para baixar
                const params = new URLSearchParams()
                if (exportAno) params.set('ano', exportAno)
                if (exportCentroCusto) params.set('centro_custo', exportCentroCusto)
                
                // Abre a janela de download através da URL da API
                window.open(`${import.meta.env.VITE_API_URL || ''}/api/equipments/finance/export/?${params.toString()}`, '_blank')
                setExportModalOpened(false)
              }}
            >
              Baixar Planilha
            </AppButton>
          </Group>
        </Stack>
      </AppModal>
    </>
  )
}