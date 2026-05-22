import { useDeferredValue, useEffect, useMemo, useState } from 'react'

import {
  ActionIcon,
  Group,
  NumberInput,
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
import { apiFetch, getApiErrorMessage } from '@/lib/api'
import { appFeedback } from '@/lib/feedback'
import { formatNullable } from '@/lib/format'
import { actionIcons, screenIcons, sectionIcons } from '@/lib/app-icons'
import type { Consumable } from '@/types/domain'


type ConsumablesResponse = {
  items: Consumable[]
  summary?: {
    total: number
    estoque_baixo: number
    alertas: number
  }
}

type ConsumableFormState = {
  nome: string
  unidade_medida: string
  quantidade_atual: number
  estoque_minimo: number
  descricao: string
}

type MovementFormState = {
  tipo: string
  quantidade: number
  responsavel: string
  destino: string
  observacao: string
}

const initialConsumableForm: ConsumableFormState = {
  nome: '',
  unidade_medida: 'un',
  quantidade_atual: 0,
  estoque_minimo: 5,
  descricao: '',
}

const initialMovementForm: MovementFormState = {
  tipo: 'saida',
  quantidade: 1,
  responsavel: '',
  destino: '',
  observacao: '',
}

export function ConsumablesPage() {
  const { lookups } = useLookups()
  const SearchIcon = actionIcons.search
  const AddIcon = actionIcons.add
  const EditIcon = actionIcons.edit
  const DeleteIcon = actionIcons.delete
  const MovementIcon = actionIcons.transfer
  const ConsumablesIcon = screenIcons.consumables
  const AlertIcon = sectionIcons.alerts
  const AvailableIcon = sectionIcons.available
  const StockIcon = sectionIcons.stock
  
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const { data, error, isLoading, reload } = useAsyncData(
    () => apiFetch<ConsumablesResponse>(`/api/consumables/?search=${encodeURIComponent(deferredSearch)}`),
    [deferredSearch],
  )
  
  const [opened, setOpened] = useState(false)
  const [movementOpened, setMovementOpened] = useState(false)
  const [editing, setEditing] = useState<Consumable | null>(null)
  const [movementTarget, setMovementTarget] = useState<Consumable | null>(null)
  const [form, setForm] = useState<ConsumableFormState>(initialConsumableForm)
  const [movementForm, setMovementForm] = useState<MovementFormState>(initialMovementForm)
  const [isSaving, setIsSaving] = useState(false)
  const [isMoving, setIsMoving] = useState(false)

  // NOVO: Estado de Seleção em Lote
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const items = useMemo(() => data?.items ?? [], [data?.items])
  const totalAlerts = items.filter((item) => item.estoque_baixo).length

  // NOVO: Limpa a seleção sempre que os dados recarregam
  useEffect(() => {
    setSelectedIds(new Set())
  }, [data?.items])

  function updateForm<Key extends keyof ConsumableFormState>(key: Key, value: ConsumableFormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function updateMovement<Key extends keyof MovementFormState>(key: Key, value: MovementFormState[Key]) {
    setMovementForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  // NOVO: Funções de Controle de Seleção
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

  function openCreate() {
    setEditing(null)
    setForm({
      ...initialConsumableForm,
      unidade_medida: lookups?.consumivel_unidades[0]?.value ?? 'un',
    })
    setOpened(true)
  }

  function openEdit(item: Consumable) {
    setEditing(item)
    setForm({
      nome: item.nome,
      unidade_medida: item.unidade_medida,
      quantidade_atual: item.quantidade_atual,
      estoque_minimo: item.estoque_minimo,
      descricao: item.descricao ?? '',
    })
    setOpened(true)
  }

  function openMovement(item: Consumable) {
    setMovementTarget(item)
    setMovementForm({
      ...initialMovementForm,
      tipo: lookups?.movimentacao_tipos[1]?.value ?? 'saida',
    })
    setMovementOpened(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)

    try {
      if (editing) {
        await apiFetch(`/api/consumables/${editing.id}/`, {
          method: 'POST',
          body: JSON.stringify(form),
        })
      } else {
        await apiFetch('/api/consumables/', {
          method: 'POST',
          body: JSON.stringify(form),
        })
      }

      appFeedback.success({
        title: editing ? 'Item atualizado' : 'Item cadastrado',
        message: 'O almoxarifado foi atualizado com sucesso.',
      })
      setOpened(false)
      await reload()
    } catch (error) {
      appFeedback.error({
        title: 'Falha ao salvar item',
        message: getApiErrorMessage(error),
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleMovementSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!movementTarget) {
      return
    }

    setIsMoving(true)
    try {
      await apiFetch(`/api/consumables/${movementTarget.id}/movements/`, {
        method: 'POST',
        body: JSON.stringify(movementForm),
      })
      appFeedback.success({
        title: 'Movimentacao registrada',
        message: `Saldo de ${movementTarget.nome} atualizado com sucesso.`,
      })
      setMovementOpened(false)
      await reload()
    } catch (error) {
      appFeedback.error({
        title: 'Falha ao registrar movimentacao',
        message: getApiErrorMessage(error),
      })
    } finally {
      setIsMoving(false)
    }
  }

  function handleTrash(item: Consumable) {
    modals.openConfirmModal({
      centered: true,
      title: 'Mover item para a lixeira',
      children: <Text size="sm">Deseja mover "{item.nome}" para a lixeira operacional?</Text>,
      labels: { confirm: 'Mover', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await apiFetch(`/api/consumables/${item.id}/trash/`, {
            method: 'POST',
          })
          appFeedback.success({
            title: 'Item movido',
            message: 'O item foi enviado para a lixeira.',
          })
          await reload()
        } catch (error) {
          appFeedback.error({
            title: 'Falha ao mover item',
            message: getApiErrorMessage(error),
          })
        }
      },
    })
  }

  // NOVO: Função para Excluir em Lote
  function handleBulkTrash() {
    modals.openConfirmModal({
      centered: true,
      title: 'Mover lote para a lixeira',
      children: <Text size="sm">Deseja mover os {selectedIds.size} itens selecionados para a lixeira?</Text>,
      labels: { confirm: 'Mover lote', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await apiFetch('/api/consumables/bulk/trash/', {
            method: 'POST',
            body: JSON.stringify({
              ids: Array.from(selectedIds),
            }),
          })
          appFeedback.success({
            title: 'Lote movido',
            message: 'Os itens selecionados foram enviados para a lixeira.',
          })
          await reload()
        } catch (error) {
          appFeedback.error({
            title: 'Falha ao mover lote',
            message: getApiErrorMessage(error),
          })
        }
      },
    })
  }

if (isLoading && !data) {
    return <LoadingPanel label="Carregando almoxarifado..." />
  }

  if (!data) {
    return (
      <AppCard>
        <Stack gap="md">
          <Text fw={700}>Nao foi possivel carregar o almoxarifado.</Text>
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
                placeholder="Buscar item"
                value={search}
                w={240}
              />
              <AppButton leftSection={<AddIcon size={14} />} onClick={openCreate}>
                Novo item
              </AppButton>
            </Group>
          }
          description="Controle o estoque com leitura imediata de saldo, consumo, ponto mínimo e reposição sugerida."
          icon={<ConsumablesIcon size={18} />}
          title="Almoxarifado premium"
        />

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          <MetricCard
            description="Itens monitorados com saldo atualizado."
            icon={<StockIcon size={18} />}
            title="Itens ativos"
            value={items.length}
          />
          <MetricCard
            description="Alertas de reposição abaixo do ponto mínimo."
            icon={<AlertIcon size={18} />}
            title="Alertas de estoque"
            value={totalAlerts}
          />
          <MetricCard
            description="Volume total disponível no almoxarifado."
            icon={<AvailableIcon size={18} />}
            title="Saldo somado"
            value={items.reduce((total, item) => total + item.quantidade_atual, 0)}
          />
        </SimpleGrid>

        {/* NOVO: Barra de Ações em Lote (Só aparece se houver selecionados) */}
        {selectedIds.size > 0 ? (
          <AppCard className="border-brand-200/80 bg-brand-0/66 shadow-none">
            <Group justify="space-between" wrap="wrap">
              <Stack gap={2}>
                <Text fw={800}>{selectedIds.size} item(ns) selecionado(s)</Text>
                <Text c="dimmed" size="sm">
                  Execute ações em lote para agilizar o controle do almoxarifado.
                </Text>
              </Stack>
              <Group>
                <AppButton color="red" leftSection={<DeleteIcon size={14} />} onClick={handleBulkTrash} variant="light">
                  Enviar para lixeira
                </AppButton>
              </Group>
            </Group>
          </AppCard>
        ) : null}

        <AppCard>
          <DataTable<Consumable>
            columns={[
              {
                key: 'nome',
                label: 'Item',
                render: (item) => (
                  <Stack gap={0}>
                    <Text fw={700}>{item.nome}</Text>
                    <Text c="dimmed" size="xs">
                      {formatNullable(item.descricao)}
                    </Text>
                  </Stack>
                ),
              },
              {
                key: 'saldo',
                label: 'Saldo atual',
                width: 130,
                render: (item) => `${item.quantidade_atual} ${item.unidade_medida_label}`,
              },
              {
                key: 'minimo',
                label: 'Estoque minimo',
                width: 130,
                render: (item) => item.estoque_minimo,
              },
              {
                key: 'status',
                label: 'Status',
                width: 150,
                render: (item) => (
                  <StatusBadge label={item.estoque_baixo ? 'Reposicao sugerida' : 'Saudavel'} value={item.estoque_baixo ? 'saida' : 'entrada'} />
                ),
              },
              {
                key: 'acoes',
                label: 'Acoes',
                width: 170,
                render: (item) => (
                  <Group gap="xs">
                    <ActionIcon color="teal" onClick={() => openMovement(item)} radius="xl" variant="light" title="Movimentar estoque">
                      <MovementIcon size={15} />
                    </ActionIcon>
                    <ActionIcon color="brand" onClick={() => openEdit(item)} radius="xl" variant="light" title="Editar item">
                      <EditIcon size={15} />
                    </ActionIcon>
                    <ActionIcon color="red" onClick={() => handleTrash(item)} radius="xl" variant="light" title="Excluir">
                      <DeleteIcon size={15} />
                    </ActionIcon>
                  </Group>
                ),
              },
            ]}
            emptyDescription="Cadastre itens como copos, cabos, mouses, teclados e outros consumíveis."
            emptyIcon={<ConsumablesIcon size={18} />}
            emptyTitle="Nenhum item encontrado"
            items={items}
            keyExtractor={(item) => item.id}
            minWidth={880}
            // NOVO: Integração de Seleção com a DataTable
            onToggleAll={toggleAll}
            onToggleRow={toggleSelection}
            rowId={(item) => item.id}
            selectedIds={selectedIds}
          />
        </AppCard>
      </Stack>

      {/* Modal de Criação e Edição */}
      <AppModal onClose={() => setOpened(false)} opened={opened} size="xl" title={editing ? 'Editar item' : 'Novo item de almoxarifado'}>
        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              <TextInput label="Nome do item" onChange={(event) => updateForm('nome', event.currentTarget.value)} required value={form.nome} />
              <Select
                data={lookups?.consumivel_unidades ?? []}
                label="Unidade de medida"
                onChange={(value) => updateForm('unidade_medida', value ?? 'un')}
                required
                value={form.unidade_medida}
              />
              <NumberInput label="Quantidade atual" min={0} onChange={(value) => updateForm('quantidade_atual', Number(value) || 0)} required value={form.quantidade_atual} />
              <NumberInput label="Estoque minimo" min={0} onChange={(value) => updateForm('estoque_minimo', Number(value) || 0)} required value={form.estoque_minimo} />
            </SimpleGrid>
            <Textarea
              autosize
              label="Descricao"
              minRows={3}
              onChange={(event) => updateForm('descricao', event.currentTarget.value)}
              placeholder="Detalhes do item, uso e observações relevantes."
              value={form.descricao}
            />
            <Group justify="flex-end">
              <AppButton color="gray" motionDisabled onClick={() => setOpened(false)} type="button" variant="subtle">
                Cancelar
              </AppButton>
              <AppButton loading={isSaving} type="submit">
                Salvar item
              </AppButton>
            </Group>
          </Stack>
        </form>
      </AppModal>

      {/* Modal de Movimentação */}
      <AppModal onClose={() => setMovementOpened(false)} opened={movementOpened} size="lg" title={`Movimentar ${movementTarget?.nome ?? 'item'}`}>
        <form onSubmit={handleMovementSubmit}>
          <Stack gap="lg">
            <Select
              data={lookups?.movimentacao_tipos ?? []}
              label="Tipo de movimentacao"
              onChange={(value) => updateMovement('tipo', value ?? 'saida')}
              required
              value={movementForm.tipo}
            />
            <NumberInput label="Quantidade" min={1} onChange={(value) => updateMovement('quantidade', Number(value) || 1)} required value={movementForm.quantidade} />
            <Select
              clearable
              data={lookups?.colaboradores.map((item) => ({ value: String(item.id), label: item.nome })) ?? []}
              label="Responsavel"
              onChange={(value) => updateMovement('responsavel', value ?? '')}
              placeholder="Selecione um colaborador"
              value={movementForm.responsavel}
            />
            <TextInput label="Destino" onChange={(event) => updateMovement('destino', event.currentTarget.value)} placeholder="Ex: TI, Copa, Atendimento" value={movementForm.destino} />
            <TextInput label="Observacao" onChange={(event) => updateMovement('observacao', event.currentTarget.value)} placeholder="Opcional" value={movementForm.observacao} />
            <Group justify="flex-end">
              <AppButton color="gray" motionDisabled onClick={() => setMovementOpened(false)} type="button" variant="subtle">
                Cancelar
              </AppButton>
              <AppButton loading={isMoving} type="submit">
                Registrar movimentacao
              </AppButton>
            </Group>
          </Stack>
        </form>
      </AppModal>
    </>
  )
}