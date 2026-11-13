import { useState } from 'react'

import { Alert, FileInput, Group, Stack, Text } from '@mantine/core'

import { AppButton } from '@/components/ui/app-button'
import { AppModal } from '@/components/ui/app-modal'
import { appFeedback } from '@/lib/feedback'

type ErroLinha = { linha: number; erro: string }

type Props = {
  opened: boolean
  onClose: () => void
  onImported: () => Promise<void> | void
}

function getCookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[2]) : ''
}

export function ConciliacaoImportModal({ opened, onClose, onImported }: Props) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [mensagemErro, setMensagemErro] = useState<string | null>(null)
  const [errosLinha, setErrosLinha] = useState<ErroLinha[]>([])

  function limparErros() {
    setMensagemErro(null)
    setErrosLinha([])
  }

  function fechar() {
    setArquivo(null)
    limparErros()
    onClose()
  }

  async function importar() {
    if (!arquivo) return
    setEnviando(true)
    limparErros()

    const form = new FormData()
    form.append('arquivo', arquivo)

    try {
      const res = await fetch('/api/finance/conciliacao/import/', {
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

      const partes = [`${data.atualizados} equipamento(s) atualizado(s)`]
      if (data.sem_alteracao) partes.push(`${data.sem_alteracao} sem alteração`)

      appFeedback.success({ title: 'Conciliação importada', message: partes.join(', ') + '.' })
      fechar()
      await onImported()
    } catch {
      setMensagemErro('Falha de conexão com o servidor. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AppModal onClose={fechar} opened={opened} size="md" title="Conciliação por planilha">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Baixe a planilha, preencha o centro de custo, a data e o valor de compra no Excel e importe de volta.
          Os equipamentos são localizados pelo número de patrimônio. Células vazias mantêm o valor atual.
        </Text>

        <Group gap="sm">
          <AppButton component="a" href="/api/finance/conciliacao/export/" variant="light">
            Baixar pendentes
          </AppButton>
          <AppButton component="a" href="/api/finance/conciliacao/export/?escopo=todos" variant="subtle">
            Baixar todos
          </AppButton>
        </Group>

        <FileInput
          label="Planilha preenchida"
          placeholder="Selecione o arquivo"
          accept=".xlsx,.csv"
          value={arquivo}
          onChange={(file) => {
            setArquivo(file)
            limparErros()
          }}
          clearable
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