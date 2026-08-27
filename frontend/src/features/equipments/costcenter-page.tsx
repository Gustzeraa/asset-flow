import { useMemo, useState } from 'react'

import {
  ActionIcon,
  Group,
  Stack,
  Text,
  TextInput,
  Select,
  Progress,
  Tooltip
} from '@mantine/core'
import { modals } from '@mantine/modals'

import { useLookups } from '@/app/lookups-context'
import { AppCard } from '@/components/ui/app-card'
import { AppButton } from '@/components/ui/app-button'
import { AppModal } from '@/components/ui/app-modal'
import { DataTable } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingPanel } from '@/components/feedback/loading-panel'
import { useAsyncData } from '@/hooks/use-async-data'
import { apiFetch, getApiErrorMessage } from '@/lib/api'
import { appFeedback } from '@/lib/feedback'
import { actionIcons, screenIcons } from '@/lib/app-icons'
import type { CentroCusto } from '@/types/domain'

type CentroCustoFormState = {
  codigo: string
  nome: string
  orcamento_anual: string
}

function createInitialForm(): CentroCustoFormState {
  return {
    codigo: '',
    nome: '',
    orcamento_anual: '',
  }
}

export function CentrosCustoPage() {
  const { refreshLookups } = useLookups()

  // Ícones
  const AddIcon = actionIcons.add
  const EditIcon = actionIcons.edit
  const DeleteIcon = actionIcons.delete
  const FinanceIcon = screenIcons.categories

  // ==========================================
  // REGRA DE NEGÓCIO: HISTÓRICO DE ANOS (SEM FUTURO)
  // ==========================================
  const anoAtual = new Date().getFullYear()
  const [anoSelecionado, setAnoSelecionado] = useState<string>(String(anoAtual))

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (anoSelecionado) params.set('ano', anoSelecionado)
    return params.toString()
  }, [anoSelecionado])

  const { data, isLoading, reload } = useAsyncData(
    () => apiFetch<any>(`/api/cost-centers/?${query}`),
    [query]
  )

  // Cria um array com os últimos 5 anos (Ex: se estamos em 2026, gera: 2026, 2025, 2024, 2023, 2022)
  const anosDisponiveis = useMemo(() => {
    if (data && Array.isArray(data.anos_disponiveis)) {
      return data.anos_disponiveis
    }
    // Fallback de segurança se os dados ainda estiverem carregando
    return [String(anoAtual)]
  }, [data, anoAtual])

  // Busca os dados da API


  // ==========================================
  // CORREÇÃO: LEITURA DO PADRÃO DJANGO (results)
  // ==========================================
  const items = useMemo<CentroCusto[]>(() => {
    if (!data) return []
    // Se o Django mandou paginado, os dados reais estão dentro de "results"
    if ('results' in data) return data.results
    if ('items' in data) return data.items
    if (Array.isArray(data)) return data
    return []
  }, [data])

  // ==========================================
  // ESTADOS DO FORMULÁRIO
  // ==========================================
  const [opened, setOpened] = useState(false)
  const [editing, setEditing] = useState<CentroCusto | null>(null)
  const [form, setForm] = useState<CentroCustoFormState>(createInitialForm())
  const [isSaving, setIsSaving] = useState(false)

  function updateForm<Key extends keyof CentroCustoFormState>(key: Key, value: CentroCustoFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function openCreate() {
    setEditing(null)
    setForm(createInitialForm())
    setOpened(true)
  }

  function openEdit(item: CentroCusto) {
    setEditing(item)
    setForm({
      codigo: item.codigo,
      nome: item.nome,
      orcamento_anual: item.orcamento_anual ?? '',
    })
    setOpened(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)

    const payload = {
      codigo: form.codigo,
      nome: form.nome,
      orcamento_anual: form.orcamento_anual || null,
    }

    try {
      if (editing) {
        await apiFetch(`/api/cost-centers/${editing.id}/`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch('/api/cost-centers/', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }

      appFeedback.success({
        title: editing ? 'Centro de Custo atualizado' : 'Centro de Custo criado',
        message: 'A estrutura contábil foi sincronizada com sucesso.',
      })
      setOpened(false)

      await reload()
      await refreshLookups()
    } catch (error) {
      appFeedback.error({ title: 'Falha ao salvar', message: getApiErrorMessage(error) })
    } finally {
      setIsSaving(false)
    }
  }

  function handleTrash(item: CentroCusto) {
    modals.openConfirmModal({
      centered: true,
      title: 'Excluir Centro de Custo',
      children: <Text size="sm">Deseja excluir "{item.nome}"? Equipamentos vinculados perderão essa referência financeira.</Text>,
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await apiFetch(`/api/cost-centers/${item.id}/trash/`, { method: 'POST' })
          appFeedback.success({ title: 'Excluído', message: 'O centro de custo foi removido.' })
          await reload()
          await refreshLookups()
        } catch (error) {
          appFeedback.error({ title: 'Falha ao excluir', message: getApiErrorMessage(error) })
        }
      },
    })
  }

  const formatarDinheiro = (valor: string | null | number) => {
    if (!valor) return "-"
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor))
  }

  return (
    <>
      <Stack gap="lg">
        <PageHeader
          actions={
            <Group gap="sm">
              <Select
                placeholder="Ano do Orçamento"
                data={anosDisponiveis}
                value={anoSelecionado}
                onChange={(val) => setAnoSelecionado(val ?? String(anoAtual))}
                w={120}
                allowDeselect={false}
              />
              <AppButton leftSection={<AddIcon size={14} />} onClick={openCreate}>
                Novo centro de custo
              </AppButton>
            </Group>
          }
          description="Gerencie os setores e departamentos responsáveis por arcar com os custos de aquisição e manutenção dos equipamentos."
          icon={<FinanceIcon size={18} />}
          title="Centros de Custo"
        />

        <AppCard>
          {isLoading ? (
            <LoadingPanel label="Carregando orçamentos..." />
          ) : (
            <DataTable<CentroCusto>
              columns={[
                {
                  key: 'codigo',
                  label: 'Código',
                  width: 120,
                  render: (item) => <Text fw={700} c="dimmed">{item.codigo}</Text>,
                },
                {
                  key: 'nome',
                  label: 'Nome do Setor / Centro de Custo',
                  render: (item) => <Text fw={600}>{item.nome}</Text>,
                },
                {
                  key: 'orcamento',
                  label: 'Gestão de Orçamento',
                  width: 300,
                  render: (item) => {
                    const orcamento = Number(item.orcamento_anual) || 0
                    const investido = Number(item.total_investido) || 0

                    if (orcamento === 0) {
                      return (
                        <Stack gap={2}>
                          <Text size="sm" c="dimmed">Orçamento não definido</Text>
                          <Text fw={600} size="xs">Total gasto: {formatarDinheiro(investido)}</Text>
                        </Stack>
                      )
                    }

                    const porcentagemGasta = (investido / orcamento) * 100
                    const estourou = porcentagemGasta > 100
                    const corDaBarra = estourou ? 'red' : porcentagemGasta > 80 ? 'orange' : 'green'

                    return (
                      <Stack gap={4}>
                        <Group justify="space-between" align="flex-end">
                          <Stack gap={0}>
                            <Text size="xs" c="dimmed" fw={600}>Total Gasto ({anoSelecionado})</Text>
                            <Text fw={700} c={estourou ? 'red.7' : 'dark'}>
                              {formatarDinheiro(investido)}
                            </Text>
                          </Stack>
                          <Stack gap={0} align="flex-end">
                            <Text size="xs" c="dimmed" fw={600}>Orçamento Anual</Text>
                            <Text size="sm" fw={500}>
                              {formatarDinheiro(orcamento)}
                            </Text>
                          </Stack>
                        </Group>

                        <Tooltip label={`${porcentagemGasta.toFixed(1)}% do orçamento utilizado`}>
                          <Progress
                            value={Math.min(porcentagemGasta, 100)}
                            color={corDaBarra}
                            size="md"
                            radius="xl"
                            striped={estourou}
                            animated={estourou}
                          />
                        </Tooltip>
                      </Stack>
                    )
                  },
                },
                {
                  key: 'acoes',
                  label: 'Ações',
                  width: 120,
                  render: (item) => (
                    <Group gap="xs">
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
              emptyDescription="Cadastre a estrutura financeira da empresa para começar a rastrear os gastos por departamento."
              emptyIcon={<FinanceIcon size={18} />}
              emptyTitle="Nenhum centro de custo"
              items={items}
              keyExtractor={(item) => item.id}
              minWidth={800}
              rowId={(item) => item.id}
            />
          )}
        </AppCard>
      </Stack>

      <AppModal onClose={() => setOpened(false)} opened={opened} size="md" title={editing ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}>
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Código Contábil"
              description="Ex: 101, TI-01, MKT"
              placeholder="Digite o código"
              required
              data-autofocus
              value={form.codigo}
              onChange={(event) => updateForm('codigo', event.currentTarget.value)}
            />

            <TextInput
              label="Nome do Centro de Custo"
              placeholder="Ex: Diretoria Executiva"
              required
              value={form.nome}
              onChange={(event) => updateForm('nome', event.currentTarget.value)}
            />

            <TextInput
              label="Orçamento Anual (Opcional)"
              description="Limite de gastos previsto para este setor no ano."
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.orcamento_anual}
              onChange={(event) => updateForm('orcamento_anual', event.currentTarget.value)}
            />

            <Group justify="flex-end" mt="md">
              <AppButton color="gray" motionDisabled onClick={() => setOpened(false)} type="button" variant="subtle">
                Cancelar
              </AppButton>
              <AppButton loading={isSaving} type="submit">
                {editing ? 'Salvar alterações' : 'Cadastrar'}
              </AppButton>
            </Group>
          </Stack>
        </form>
      </AppModal>
    </>
  )
}