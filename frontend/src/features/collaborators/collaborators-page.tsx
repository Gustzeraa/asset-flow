import { useDeferredValue, useEffect, useMemo, useState } from 'react'

import {
  ActionIcon,
  Badge,
  Group,
  ScrollArea,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  FileInput,
  Select
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
import { actionIcons, screenIcons, sectionIcons } from '@/lib/app-icons'
import type { Collaborator } from '@/types/domain'

type CollaboratorsResponse = {
  items: Collaborator[]
}

type CollaboratorFormState = {
  nome: string
  cpf: string
  cargo: string
  departamento_id: string
  email: string
  ativo: boolean
}

const initialForm: CollaboratorFormState = {
  nome: '',
  cpf: '',
  cargo: '',
  departamento_id: '',
  email: '',
  ativo: true,
}

function formatCPF(value: string) {
  let v = value.replace(/\D/g, "")
  v = v.replace(/(\d{3})(\d)/, "$1.$2")
  v = v.replace(/(\d{3})(\d)/, "$1.$2")
  v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2")
  return v.slice(0, 14)
}

export function CollaboratorsPage() {
  const { lookups, refreshLookups } = useLookups()

  // Ícones
  const SearchIcon = actionIcons.search
  const AddIcon = actionIcons.add
  const EditIcon = actionIcons.edit
  const DeleteIcon = actionIcons.delete
  const DocumentIcon = actionIcons.document
  const UploadIcon = actionIcons.upload
  const ArchiveIcon = actionIcons.document

  const CollaboratorsIcon = screenIcons.collaborators
  const LinkedAssetIcon = screenIcons.equipments
  const DepartmentIcon = screenIcons.categories
  const PeopleIcon = sectionIcons.collaborators

  // Estados de Listagem e Busca
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

  const [uploadingTerm, setUploadingTerm] = useState<Collaborator | null>(null)
  const [termFile, setTermFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const [viewingTerms, setViewingTerms] = useState<Collaborator | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const [quickDeptOpened, setQuickDeptOpened] = useState(false)
  const [quickDeptName, setQuickDeptName] = useState('')
  const [isSavingQuickDept, setIsSavingQuickDept] = useState(false)

  async function handleQuickCreateDepartment(event: React.FormEvent) {
    event.preventDefault()
    if (!quickDeptName.trim()) return

    setIsSavingQuickDept(true)
    try {
      const response = await apiFetch<{ item: { id: number, nome: string } }>('/api/departments/', {
        method: 'POST',
        body: JSON.stringify({ nome: quickDeptName }),
      })

      appFeedback.success({
        title: 'Departamento criado',
        message: 'O novo departamento já está selecionado no formulário.'
      })

      await refreshLookups()
      updateField('departamento_id', String(response.item.id))

      setQuickDeptOpened(false)
      setQuickDeptName('')
    } catch (error) {
      appFeedback.error({
        title: 'Erro ao criar departamento',
        message: getApiErrorMessage(error),
      })
    } finally {
      setIsSavingQuickDept(false)
    }
  }

  const items = useMemo(() => data?.items ?? [], [data?.items])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [data?.items])

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
      departamento_id: item.departamento_id ? String(item.departamento_id) : '',
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

    const payload: any = { ...form }
    payload.departamento = form.departamento_id ? parseInt(form.departamento_id, 10) : null
    delete payload.departamento_id

    try {
      if (editing) {
        await apiFetch(`/api/collaborators/${editing.id}/`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch('/api/collaborators/', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }

      appFeedback.success({
        title: editing ? 'Colaborador atualizado' : 'Colaborador cadastrado',
        message: 'Os dados foram sincronizados com sucesso.',
      })
      setOpened(false)
      await Promise.all([reload(), refreshLookups()])
    } catch (error) {
      appFeedback.error({
        title: 'Falha ao salvar colaborador',
        message: getApiErrorMessage(error),
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUploadSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!uploadingTerm || !termFile) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('arquivo_assinado', termFile)

    try {
      await apiFetch(`/api/collaborators/${uploadingTerm.id}/upload-term/`, {
        method: 'POST',
        body: formData,
      })

      appFeedback.success({
        title: 'Termo anexado',
        message: 'O termo assinado foi salvo com sucesso.',
      })
      setUploadingTerm(null)
      setTermFile(null)
      await reload()
    } catch (error) {
      appFeedback.error({
        title: 'Erro no upload',
        message: getApiErrorMessage(error),
      })
    } finally {
      setIsUploading(false)
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
          appFeedback.success({
            title: 'Registro movido',
            message: 'O colaborador foi enviado para a lixeira.',
          })
          await Promise.all([reload(), refreshLookups()])
        } catch (error) {
          appFeedback.error({
            title: 'Falha ao mover registro',
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
      children: <Text size="sm">Deseja mover os {selectedIds.size} colaboradores selecionados para a lixeira?</Text>,
      labels: { confirm: 'Mover lote', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await apiFetch('/api/collaborators/bulk/trash/', {
            method: 'POST',
            body: JSON.stringify({
              ids: Array.from(selectedIds),
            }),
          })
          appFeedback.success({
            title: 'Lote movido',
            message: 'Os colaboradores selecionados foram enviados para a lixeira.',
          })
          await Promise.all([reload(), refreshLookups()])
        } catch (error) {
          appFeedback.error({
            title: 'Falha ao mover lote',
            message: getApiErrorMessage(error),
          })
        }
      },
    })
  }

  function handleDeleteTerm(termoId: number) {
    if (!viewingTerms) return;

    modals.openConfirmModal({
      centered: true,
      title: 'Excluir documento assinado',
      children: <Text size="sm">Tem certeza que deseja apagar este termo permanentemente? O arquivo PDF será destruído.</Text>,
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await apiFetch(`/api/collaborators/${viewingTerms.id}/term/${termoId}/delete/`, {
            method: 'POST',
          })
          appFeedback.success({
            title: 'Documento excluído',
            message: 'O termo foi removido do histórico com sucesso.',
          })
          setViewingTerms(null)
          await reload()
        } catch (error) {
          appFeedback.error({
            title: 'Falha ao excluir documento',
            message: getApiErrorMessage(error),
          })
        }
      },
    })
  }

  if (isLoading && !data) {
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

  async function handleGenerateTerm(item: Collaborator) {
    try {
      // Limpa o nome do colaborador para usar no nome do arquivo (ex: joao_silva.pdf)
      const cleanName = item.nome.trim().replace(/\s+/g, '_').toLowerCase()
      const fileName = `termo_responsabilidade_${cleanName}.pdf`

      await downloadFile(`/api/collaborators/${item.id}/term/`, fileName)

    } catch (error) {
      appFeedback.error({
        title: 'Erro ao gerar termo',
        message: getApiErrorMessage(error),
      })
    }
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
                placeholder="Buscar colaborador"
                value={search}
                w={248}
              />
              <AppButton leftSection={<AddIcon size={14} />} onClick={openCreate}>
                Novo colaborador
              </AppButton>
            </Group>
          }
          description="Gerencie pessoas, ativos vinculados e geração de termos de responsabilidade em uma única visão."
          icon={<CollaboratorsIcon size={18} />}
          title="Gestao de colaboradores"
        />

        <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
          <MetricCard
            description="Base operacional disponível para vinculação de ativos."
            icon={<PeopleIcon size={18} />}
            title="Registros ativos"
            value={items.filter((item) => item.ativo).length}
          />
          <MetricCard
            description="Colaboradores atualmente com patrimônio associado."
            icon={<LinkedAssetIcon size={18} />}
            title="Com ativos vinculados"
            value={items.filter((item) => item.ativos_count > 0).length}
          />
          <MetricCard
            description="Times visíveis neste recorte da operação."
            icon={<DepartmentIcon size={18} />}
            title="Departamentos distintos"
            value={new Set(items.map((item) => item.departamento)).size}
          />
        </SimpleGrid>

        {selectedIds.size > 0 ? (
          <AppCard className="border-brand-200/80 bg-brand-0/66 shadow-none">
            <Group justify="space-between" wrap="wrap">
              <Stack gap={2}>
                <Text fw={800}>{selectedIds.size} colaborador(es) selecionado(s)</Text>
                <Text c="dimmed" size="sm">
                  Execute ações em lote mantendo o fluxo do inventário consistente.
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
                width: 180,
                render: (item) => (
                  <Group gap="xs">
                    <ActionIcon color="brand" onClick={() => openEdit(item)} radius="xl" variant="light" title="Editar">
                      <EditIcon size={15} />
                    </ActionIcon>

                    <ActionIcon color="grape" onClick={() => handleGenerateTerm(item)} radius="xl" variant="light" title="Imprimir termo pdf">
                      <DocumentIcon size={15} />
                    </ActionIcon>

                    <ActionIcon
                      color={(item as any).termo_assinado ? 'blue' : 'gray'}
                      onClick={() => (item as any).termo_assinado ? setViewingTerms(item) : undefined}
                      radius="xl"
                      variant="light"
                      title="Ver termo assinado"
                      disabled={!(item as any).termo_assinado}
                    >
                      <ArchiveIcon size={15} />
                    </ActionIcon>

                    <ActionIcon color="teal" onClick={() => setUploadingTerm(item)} radius="xl" variant="light" title="Anexar termo assinado">
                      <UploadIcon size={15} />
                    </ActionIcon>

                    <ActionIcon color="red" onClick={() => handleTrash(item)} radius="xl" variant="light" title="Excluir">
                      <DeleteIcon size={15} />
                    </ActionIcon>
                  </Group>
                ),
              },
            ]}
            emptyDescription="Cadastre colaboradores para responsabilização de ativos e rastreio operacional."
            emptyIcon={<CollaboratorsIcon size={18} />}
            emptyTitle="Nenhum colaborador encontrado"
            items={items}
            keyExtractor={(item) => item.id}
            minWidth={880}
            onToggleAll={toggleAll}
            onToggleRow={toggleSelection}
            rowId={(item) => item.id}
            selectedIds={selectedIds}
          />
        </AppCard>
      </Stack>

      <AppModal onClose={() => setOpened(false)} opened={opened} size="xl" title={editing ? 'Editar colaborador' : 'Novo colaborador'}>
        <form onSubmit={handleSubmit}>
          <Stack gap="xl">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              <TextInput label="Nome completo" onChange={(event) => updateField('nome', event.currentTarget.value)} required value={form.nome} />
              <TextInput
                label="CPF"
                onChange={(event) => updateField('cpf', formatCPF(event.currentTarget.value))}
                placeholder="000.000.000-00"
                required
                value={form.cpf}
                maxLength={14}
              />
              <TextInput label="Cargo" onChange={(event) => updateField('cargo', event.currentTarget.value)} required value={form.cargo} />

              <Select
                data={lookups?.departamentos.map((d) => ({ value: String(d.id), label: d.nome })) ?? []}
                label="Departamento"
                onChange={(value) => updateField('departamento_id', value ?? '')}
                placeholder="Selecione o departamento"
                required
                value={form.departamento_id}
                searchable
                rightSectionPointerEvents="auto"
                rightSection={
                  <ActionIcon
                    size="sm"
                    variant="light"
                    color="brand"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      setQuickDeptOpened(true)
                    }}
                    title="Novo departamento"
                  >
                    <AddIcon size={14} />
                  </ActionIcon>
                }
              />

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

      <AppModal opened={quickDeptOpened} onClose={() => setQuickDeptOpened(false)} title="Novo Departamento Rápido" size="sm">
        <form onSubmit={handleQuickCreateDepartment}>
          <Stack gap="md">
            <TextInput
              label="Nome do departamento"
              placeholder="Ex: TI, RH, Financeiro..."
              required
              data-autofocus
              value={quickDeptName}
              onChange={(e) => setQuickDeptName(e.currentTarget.value)}
            />
            <Group justify="flex-end">
              <AppButton variant="subtle" color="gray" onClick={() => setQuickDeptOpened(false)} type="button">Cancelar</AppButton>
              <AppButton type="submit" loading={isSavingQuickDept}>Salvar</AppButton>
            </Group>
          </Stack>
        </form>
      </AppModal>

      <AppModal
        onClose={() => { setUploadingTerm(null); setTermFile(null); }}
        opened={!!uploadingTerm}
        size="md"
        title="Anexar termo assinado"
      >
        <form onSubmit={handleUploadSubmit}>
          <Stack gap="xl">
            <Text size="sm">
              Selecione o arquivo PDF assinado por <strong>{uploadingTerm?.nome}</strong> para armazenar no sistema.
            </Text>

            <FileInput
              accept="application/pdf"
              clearable
              label="Arquivo do termo (PDF)"
              onChange={setTermFile}
              placeholder="Clique para selecionar o documento..."
              required
              value={termFile}
            />

            <Group justify="flex-end">
              <AppButton color="gray" motionDisabled onClick={() => { setUploadingTerm(null); setTermFile(null); }} type="button" variant="subtle">
                Cancelar
              </AppButton>
              <AppButton loading={isUploading} type="submit" disabled={!termFile}>
                Salvar anexo
              </AppButton>
            </Group>
          </Stack>
        </form>
      </AppModal>

      <AppModal
        onClose={() => setViewingTerms(null)}
        opened={!!viewingTerms}
        size="lg"
        title={`Termos Assinados - ${viewingTerms?.nome}`}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Abaixo está o histórico de todos os termos de responsabilidade assinados e armazenados para este colaborador.
          </Text>

          {(viewingTerms as any)?.termos_assinados?.length ? (
            <ScrollArea.Autosize mah={300}>
              <Stack gap="xs">
                {(viewingTerms as any).termos_assinados.map((termo: any) => (
                  <Group key={termo.id} justify="space-between" p="sm" style={{ border: '1px solid #eee', borderRadius: '8px' }}>
                    <Group>
                      <DocumentIcon size={20} color="gray" />
                      <div>
                        <Text fw={500} size="sm">Termo de Responsabilidade</Text>
                        <Text size="xs" c="dimmed">Enviado em: {termo.data}</Text>
                      </div>
                    </Group>
                    <AppButton
                      variant="light"
                      size="xs"
                      onClick={() => window.open(termo.url, '_blank', 'noopener,noreferrer')}
                    >
                      Abrir PDF
                    </AppButton>
                    <AppButton
                      variant="light"
                      size="xs"
                      color="red"
                      onClick={() => handleDeleteTerm(termo.id)}
                    >
                      Excluir
                    </AppButton>
                  </Group>
                ))}
              </Stack>
            </ScrollArea.Autosize>
          ) : (
            <Text size="sm" fs="italic" c="dimmed" ta="center" py="xl">
              Nenhum termo assinado foi anexado para este colaborador.
            </Text>
          )}

          <Group justify="flex-end" mt="md">
            <AppButton color="gray" onClick={() => setViewingTerms(null)} variant="subtle">
              Fechar
            </AppButton>
          </Group>
        </Stack>
      </AppModal>
    </>
  )
}