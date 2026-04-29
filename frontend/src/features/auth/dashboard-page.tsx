import { Anchor, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { IconArrowRight, IconLockCheck, IconLogout } from '@tabler/icons-react'

import { useAuth } from '@/app/auth-context'
import { AppCard } from '@/components/ui/app-card'
import { AppButton } from '@/components/ui/app-button'


const shortcuts = [
  {
    href: '/',
    title: 'Painel legado',
    description: 'Acesse o dashboard atual do Django sem precisar repetir a autenticacao.',
  },
  {
    href: '/equipamentos/',
    title: 'Equipamentos',
    description: 'Abra a listagem operacional existente a partir da sessao autenticada.',
  },
  {
    href: '/rh/',
    title: 'Colaboradores',
    description: 'Continue para a area de colaboradores aproveitando a mesma sessao.',
  },
  {
    href: '/almoxarifado/',
    title: 'Consumiveis',
    description: 'Entre nas rotas de almoxarifado com o login ja validado.',
  },
]


export function DashboardPage() {
  const { logout, user } = useAuth()
  const displayName = user?.first_name || user?.username || 'usuario'

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3f7ff_0%,#e8eefb_100%)] px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
          <AppCard className="border-slate-200/70 bg-white/94 p-6 sm:p-8">
            <Stack gap="xl">
              <Group align="center" gap="sm">
                <ThemeIcon color="brand.5" radius="xl" size={42} variant="light">
                  <IconLockCheck size={22} />
                </ThemeIcon>
                <div>
                  <Text className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Sessao autenticada
                  </Text>
                  <Title className="!text-[2rem] tracking-[-0.05em] text-slate-900" order={1}>
                    Acesso liberado para {displayName}.
                  </Title>
                </div>
              </Group>

              <Text c="dimmed" className="max-w-2xl text-[0.98rem] leading-7">
                Esta branch entrega a tela de login em React com autenticacao via sessao Django. Depois de entrar,
                voce pode seguir para as rotas legadas usando a mesma credencial ativa.
              </Text>

              <div className="grid gap-3 md:grid-cols-2">
                {shortcuts.map((shortcut) => (
                  <Anchor
                    key={shortcut.href}
                    className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4 no-underline transition-colors hover:border-brand-4 hover:bg-white"
                    href={shortcut.href}
                  >
                    <Stack gap={6}>
                      <Group align="center" justify="space-between" wrap="nowrap">
                        <Text className="text-[0.96rem] text-slate-900" fw={700}>
                          {shortcut.title}
                        </Text>
                        <ThemeIcon color="brand.5" radius="xl" size={30} variant="light">
                          <IconArrowRight size={16} />
                        </ThemeIcon>
                      </Group>
                      <Text className="text-[0.84rem] leading-6 text-slate-500">
                        {shortcut.description}
                      </Text>
                    </Stack>
                  </Anchor>
                ))}
              </div>
            </Stack>
          </AppCard>

          <AppCard className="border-slate-200/70 bg-[linear-gradient(180deg,#0d1b32_0%,#163059_100%)] p-6 text-white sm:p-7">
            <Stack className="h-full" gap="xl" justify="space-between">
              <div>
                <Text className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-white/56">
                  Conta atual
                </Text>
                <Title className="mt-3 !text-[1.9rem] tracking-[-0.05em] text-white" order={2}>
                  {user?.username}
                </Title>
                <Text className="mt-2 text-[0.92rem] leading-7 text-white/70">
                  O login usa a autenticacao do Django e disponibiliza uma camada inicial para a transicao da
                  interface sem interromper o sistema atual.
                </Text>
              </div>

              <Stack gap="sm">
                <Text className="text-[0.82rem] leading-6 text-white/66">
                  Email: {user?.email || 'nao informado'}
                </Text>
                <Text className="text-[0.82rem] leading-6 text-white/66">
                  Permissao administrativa: {user?.is_superuser ? 'sim' : 'nao'}
                </Text>
                <AppButton
                  color="red"
                  leftSection={<IconLogout size={16} />}
                  onClick={() => void logout()}
                  variant="light"
                >
                  Encerrar sessao
                </AppButton>
              </Stack>
            </Stack>
          </AppCard>
        </div>
      </div>
    </div>
  )
}
