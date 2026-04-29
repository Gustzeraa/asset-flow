import { Avatar, Burger, Group, Menu, Stack, Text } from '@mantine/core'
import { IconChevronDown, IconLogout, IconTrash } from '@tabler/icons-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/app/auth-context'
import { AppButton } from '@/components/ui/app-button'

const titles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Painel executivo', subtitle: 'Visao consolidada dos ativos, times e alertas operacionais.' },
  '/equipamentos': { title: 'Gestao de equipamentos', subtitle: 'Controle patrimonial, transferencias e importacoes em um fluxo unico.' },
  '/categorias': { title: 'Categorias de ativos', subtitle: 'Organize a taxonomia do inventario com padrao visual e operacional.' },
  '/colaboradores': { title: 'Colaboradores', subtitle: 'Responsabilidades, status e ativos vinculados com leitura clara.' },
  '/consumiveis': { title: 'Almoxarifado', subtitle: 'Saldo, ponto minimo e movimentacoes de estoque com resposta rapida.' },
  '/historico': { title: 'Historico operacional', subtitle: 'Auditoria das movimentacoes com filtros e exportacao.' },
  '/lixeira': { title: 'Lixeira operacional', subtitle: 'Restaure ou remova registros com seguranca e rastreabilidade.' },
}


type HeaderProps = {
  opened: boolean
  onToggle: () => void
}


export function Header({ onToggle, opened }: HeaderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const meta = titles[location.pathname] ?? titles['/dashboard']

  return (
    <Group align="center" justify="space-between" wrap="wrap">
      <Group align="center" wrap="nowrap">
        <Burger hiddenFrom="md" onClick={onToggle} opened={opened} size="sm" />
        <Stack gap={2}>
          <Text className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-slate-400">Asset Flow Premium</Text>
          <Text className="text-2xl font-extrabold tracking-[-0.04em] text-slate-900">{meta.title}</Text>
          <Text c="dimmed" maw={680} size="sm">
            {meta.subtitle}
          </Text>
        </Stack>
      </Group>

      <Group align="center">
        <AppButton color="dark" leftSection={<IconTrash size={16} />} onClick={() => navigate('/lixeira')} variant="light">
          Lixeira
        </AppButton>
        <Menu position="bottom-end" shadow="md" width={220}>
          <Menu.Target>
            <Group className="cursor-pointer rounded-full border border-white/70 bg-white/92 px-2 py-1 shadow-[0_18px_48px_rgba(8,18,41,0.08)]" gap="sm" wrap="nowrap">
              <Avatar color="brand" radius="xl">
                {user?.username.slice(0, 2).toUpperCase()}
              </Avatar>
              <Stack gap={0}>
                <Text fw={700} size="sm">
                  {user?.username}
                </Text>
                <Text c="dimmed" size="xs">
                  Sessao autenticada
                </Text>
              </Stack>
              <IconChevronDown size={16} />
            </Group>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Conta</Menu.Label>
            <Menu.Item component={Link} leftSection={<IconTrash size={16} />} to="/lixeira">
              Ir para a lixeira
            </Menu.Item>
            <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={() => void logout()}>
              Encerrar sessao
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  )
}
