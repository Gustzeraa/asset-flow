import { useState } from 'react'

import { Alert, FileInput, Group, Stack, Switch, Text } from '@mantine/core'

import { AppButton } from '@/components/ui/app-button'
import { AppModal } from '@/components/ui/app-modal'
import { appFeedback } from '@/lib/feedback'

type ErroLinha = { linha: number; erro: string }

type ResultadoImportacao = {
  criados: number
  atualizados: number
  ignorados: number
}

type Props = {
  opened: boolean
  onClose: () => void
  onImported: () => Promise<void> | void
}

function getCookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[2]) : ''
}

export function ColaboradorImportModal({ opened, onClose, onImported }: Props) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [atualizar, setAtualizar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [mensagemErro, setMensagemErro] = useState<string | null>(null)
  const [errosLinha, setErrosLinha] = useState<ErroLinha[]>([])

  function limparErros() {
    setMensagemErro(null)
    setErrosLinha([])
  }

  function fechar() {
    setArquivo(null)
    setAtualizar(false)
    limparErros()
    onClose()
  }

  async function importar() {
    if (!arquivo) return
    setEnviando(true)
    limparErros()

    const form = new FormData()
    form.append('arquivo', arquivo)
    form.append('atualizar', String(atualizar))

    try {
      // fetch direto: o upload vai como multipart, sem Content-Type JSON
      const res = await fetch('/api/collaborators/import/', {
        method: 'POST',
        body: form,
        credentials: 'include',
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setMensagemErro(data.detail ?? 'Não foi possível importar a planilha.')
        setErrosLinha(data.erros ?? [])
        return
      }

      const r = data as ResultadoImportacao
      const partes = [`${r.criados} criado(s)`]
      if (r.atualizados) partes.push(`${r.atualizados} atualizado(s)`)
      if (r.ignorados) partes.push(`${r.ignorados} ignorado(s) por já existirem`)

      appFeedback.success({ title: 'Importação concluída', message: partes.join(', ') + '.' })
      fechar()
      await onImported()
    } catch {
      setMensagemErro('Falha de conexão com o servidor. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AppModal onClose={fechar} opened={opened} size="md" title="Importar Colaboradores">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Envie uma planilha .xlsx ou .csv com as colunas Nome, E-mail, Cargo, Departamento, CPF e Ativo, todas obrigatórias. Departamentos que não existirem serão criados.
          Os colaboradores são identificados pelo e-mail.
        </Text>

        <AppButton
          component="a"
          href="/api/collaborators/import/template/"
          variant="light"
          w="fit-content"
        >
          Baixar planilha modelo
        </AppButton>

        <FileInput
          label="Planilha"
          placeholder="Selecione o arquivo"
          accept=".xlsx,.csv"
          value={arquivo}
          onChange={(file) => {
            setArquivo(file)
            limparErros()
          }}
          clearable
        />

        <Switch
          label="Atualizar colaboradores que já existem (mesmo e-mail)"
          description="Desligado: e-mails já cadastrados são ignorados."
          checked={atualizar}
          onChange={(event) => setAtualizar(event.currentTarget.checked)}
        />

        {mensagemErro && (
          <Alert color="red" title={mensagemErro}>
            {errosLinha.length > 0 && (
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {errosLinha.map((e) => (
                  <Text key={e.linha} size="sm">
                    Linha {e.linha}: {e.erro}
                  </Text>
                ))}
              </div>
            )}
          </Alert>
        )}

        <Group justify="flex-end" mt="md">
          <AppButton color="gray" motionDisabled onClick={fechar} type="button" variant="subtle">
            Cancelar
          </AppButton>
          <AppButton disabled={!arquivo} loading={enviando} onClick={importar}>
            Importar
          </AppButton>
        </Group>
      </Stack>
    </AppModal>
  )
}