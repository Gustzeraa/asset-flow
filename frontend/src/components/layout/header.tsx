import { Avatar, Burger, Group, Menu, Stack, Text, ThemeIcon } from '@mantine/core'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '@/app/auth-context'
import { actionIcons, screenIconsByPath } from '@/lib/app-icons'

const titles: Record<string, string> = {
  '/dashboard': 'Painel executivo',
  '/equipamentos': 'Gestao de equipamentos',
  '/categorias': 'Categorias de ativos',
  '/colaboradores': 'Colaboradores',
  '/consumiveis': 'Almoxarifado',
  '/historico': 'Historico operacional',
  '/lixeira': 'Lixeira operacional',
}


type HeaderProps = {
  opened: boolean
  onToggle: () => void
}


export function Header({ onToggle, opened }: HeaderProps) {
  const location = useLocation()
  const { logout, user } = useAuth()
  const title = titles[location.pathname] ?? titles['/dashboard']
  const username = user?.username ?? 'Operador'
  const initials = username.slice(0, 2).toUpperCase()
  const RouteIcon = screenIconsByPath[location.pathname as keyof typeof screenIconsByPath] ?? screenIconsByPath['/dashboard']
  const TrashIcon = actionIcons.delete
  const ChevronIcon = actionIcons.chevronDown
  const LogoutIcon = actionIcons.logout

  return (
    <Group align="center" className="min-h-[70px] w-full gap-4" justify="space-between" wrap="nowrap">
      <Group align="center" className="min-w-0 flex-1 gap-3.5" wrap="nowrap">
        <Burger hiddenFrom="lg" onClick={onToggle} opened={opened} size="xs" />
        <ThemeIcon
          className="border border-brand-100/90 bg-[linear-gradient(180deg,rgba(240,246,255,0.96)_0%,rgba(224,235,255,0.92)_100%)] text-brand-700 shadow-none"
          radius="xl"
          size={38}
          variant="transparent"
        >
          <RouteIcon size={18} />
        </ThemeIcon>
        <Stack className="min-w-0" gap={1}>
          <Text className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Gestão de fluxo de ativos</Text>
          <Text className="truncate text-[1.05rem] font-semibold tracking-[-0.03em] text-slate-800">{title}</Text>
        </Stack>
      </Group>

      <Menu offset={10} position="bottom-end" shadow="md" transitionProps={{ duration: 140, transition: 'pop-top-right' }} width={228}>
          <Menu.Target>
            <Group className="cursor-pointer rounded-[24px] border border-white/80 bg-white/78 px-2 py-1.5 shadow-[0_12px_30px_rgba(8,18,41,0.05)] backdrop-blur-md transition-colors duration-150 hover:bg-white/88 sm:pr-3.5" gap="sm" wrap="nowrap">
              <Avatar color="brand" radius="xl" size={38}>
                {initials}
              </Avatar>
              <Stack className="hidden sm:flex" gap={0}>
                <Text fw={700} size="sm">
                  {username}
                </Text>
                <Text c="dimmed" size="11px">
                  Sessao autenticada
                </Text>
              </Stack>
              <ChevronIcon className="hidden sm:block text-slate-500" size={14} />
            </Group>
          </Menu.Target>
          <Menu.Dropdown className="rounded-[18px] border border-slate-200/80 bg-white/96 p-1 shadow-[0_18px_48px_rgba(15,23,42,0.1)]">
            <Menu.Label>Aplicação</Menu.Label>
            <Menu.Item className="rounded-xl" component={Link} leftSection={<TrashIcon size={14} />} to="/lixeira">
              Ir para a lixeira
            </Menu.Item>
            <Menu.Divider />
            <Menu.Label>Sessão</Menu.Label>
            <Menu.Item className="rounded-xl" color="red" leftSection={<LogoutIcon size={14} />} onClick={() => void logout()}>
              Encerrar sessao
            </Menu.Item>
          </Menu.Dropdown>
      </Menu>
    </Group>
  )
}
