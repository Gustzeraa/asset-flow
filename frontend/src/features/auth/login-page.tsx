import { useState } from 'react'

import {
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconArrowRight, IconChartBar, IconCircleCheck, IconDeviceDesktopAnalytics, IconShieldLock } from '@tabler/icons-react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'

import heroIllustration from '@/assets/login-illustration.png'
import { useAuth } from '@/app/auth-context'
import { AppCard } from '@/components/ui/app-card'
import { AppButton } from '@/components/ui/app-button'
import { getApiErrorMessage } from '@/lib/api'

const quickBenefits = [
  {
    icon: IconDeviceDesktopAnalytics,
    title: 'Inventário em tempo real',
    description: 'Ativos e responsáveis em uma visão única.',
  },
  {
    icon: IconChartBar,
    title: 'Leitura executiva imediata',
    description: 'Indicadores claros para priorizar demandas.',
  },
  {
    icon: IconShieldLock,
    title: 'Rastreabilidade protegida',
    description: 'Histórico preservado para auditoria interna.',
  },
]

const accessHighlights = [
  'Acesso restrito para usuários autorizados do ambiente interno.',
  'Entrada direta no painel de ativos, materiais e movimentações.',
]


function getNextPath(searchParams: URLSearchParams) {
  const nextPath = searchParams.get('next')
  if (!nextPath || !nextPath.startsWith('/')) {
    return '/dashboard'
  }

  return nextPath
}


function isSpaPath(pathname: string) {
  return pathname === '/dashboard' || pathname === '/login'
}


export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      await login(username, password)
      const nextPath = getNextPath(searchParams)
      if (isSpaPath(nextPath)) {
        navigate(nextPath, { replace: true })
      } else {
        window.location.assign(nextPath)
      }
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Falha no acesso',
        message: getApiErrorMessage(error, 'Não foi possível autenticar a sessão.'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#edf4ff_0%,#e2ebfa_100%)]">
      <div className="grid min-h-screen lg:grid-cols-2">
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="min-h-[42vh]"
          initial={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.45 }}
        >
          <section className="relative flex min-h-[42vh] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(87,153,255,0.22),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.16),_transparent_28%),linear-gradient(145deg,#081224_0%,#10284d_58%,#123867_100%)] px-5 py-7 text-white sm:px-8 sm:py-9 md:px-10 md:py-10 lg:min-h-screen lg:px-10 lg:py-8 xl:px-12">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),transparent_30%,transparent_70%,rgba(255,255,255,0.03))]" />
            <div className="absolute right-[-10%] top-[8%] h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />
            <div className="absolute left-[-12%] bottom-[8%] h-60 w-60 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative z-10 flex h-full w-full flex-col gap-7 md:gap-8 lg:justify-between">
              <div className="grid gap-7 md:gap-8 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:items-center xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
                <div className="max-w-[24rem]">
                  <Stack gap="sm">
                    <Title className="max-w-[9ch] !text-[clamp(1.85rem,5vw,2.9rem)] leading-[1.05] tracking-[-0.05em] text-white" order={1}>
                      Gestão patrimonial com visão executiva e operação sob controle.
                    </Title>
                    <Text className="max-w-[24rem] text-[0.88rem] leading-6 text-white/74 sm:text-[0.92rem]">
                      O Asset Flow centraliza inventário, movimentações, responsáveis e histórico operacional em uma
                      experiência clara para quem acompanha resultados e para quem executa a rotina diária.
                    </Text>
                  </Stack>
                </div>

                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center md:justify-start lg:justify-center"
                  initial={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <motion.img
                    alt="Ilustracao do painel do Asset Flow"
                    animate={{ y: [0, -10, 0] }}
                    className="max-h-[13rem] w-auto max-w-[15rem] object-contain drop-shadow-[0_30px_90px_rgba(4,10,22,0.42)] sm:max-h-[15rem] sm:max-w-[17rem] md:max-h-[17rem] md:max-w-[19rem] lg:max-h-[18rem] lg:max-w-[21rem] xl:max-h-[19rem] xl:max-w-[23rem]"
                    src={heroIllustration}
                    transition={{ duration: 12, ease: 'easeInOut', repeat: Number.POSITIVE_INFINITY }}
                  />
                </motion.div>
              </div>

              <div className="grid gap-3 pb-1 sm:grid-cols-2 xl:grid-cols-3">
                {quickBenefits.map((item, index) => {
                  const Icon = item.icon

                  return (
                    <div
                      key={item.title}
                      className={`rounded-[22px] border border-white/10 bg-white/[0.08] px-3 py-3 backdrop-blur-md ${
                        index === 2 ? 'sm:col-span-2 xl:col-span-1' : ''
                      }`}
                    >
                      <Stack gap="sm">
                        <ThemeIcon color="brand.3" radius="xl" size={32} variant="light">
                          <Icon size={16} />
                        </ThemeIcon>
                        <Stack gap={4}>
                          <Text className="text-[0.8rem] text-white" fw={700}>
                            {item.title}
                          </Text>
                          <Text className="text-[0.72rem] leading-5 text-white/66">
                            {item.description}
                          </Text>
                        </Stack>
                      </Stack>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </motion.div>

        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="min-h-[52vh]"
          initial={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          <section className="relative flex min-h-[52vh] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),_transparent_22%),linear-gradient(180deg,#ffffff_0%,#f4f8ff_100%)] px-5 py-7 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:min-h-screen lg:px-10 lg:py-8 xl:px-12">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.48),rgba(226,236,250,0.22))]" />
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-100/60 blur-3xl" />
            <div className="relative z-10 flex w-full justify-center">
              <AppCard className="w-full max-w-[28rem] border-slate-200/70 bg-white/94 p-4 shadow-[0_28px_70px_rgba(8,18,41,0.08)] sm:p-5 md:max-w-[30rem] lg:max-w-[28rem] xl:max-w-[30rem]">
                <Stack gap="md">
                  <Stack align="center" gap={5}>
                    <Title className="!text-[1.7rem] text-center sm:!text-[1.9rem] md:!text-[2rem]" order={2}>
                      Entrar no Asset Flow
                    </Title>
                    <Text c="dimmed" className="max-w-[23rem] text-center text-[0.88rem] leading-6 sm:text-[0.92rem]">
                      Faca login para acompanhar ativos, materiais, movimentações e rotinas internas com segurança.
                    </Text>
                  </Stack>

                  <form onSubmit={handleSubmit}>
                    <Stack gap="md">
                      <TextInput
                        autoComplete="username"
                        autoFocus
                        label="Usuário"
                        onChange={(event) => setUsername(event.currentTarget.value)}
                        placeholder="Digite seu usuário"
                        required
                        size="md"
                        value={username}
                      />
                      <PasswordInput
                        autoComplete="current-password"
                        label="Senha"
                        onChange={(event) => setPassword(event.currentTarget.value)}
                        placeholder="Digite sua senha"
                        required
                        size="md"
                        value={password}
                      />
                      <AppButton
                        fullWidth
                        leftSection={<IconArrowRight size={16} />}
                        loading={isSubmitting}
                        size="md"
                        type="submit"
                      >
                        Acessar painel
                      </AppButton>
                    </Stack>
                  </form>

                  <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-3.5">
                    <Stack gap="sm">
                      <Group align="center" wrap="nowrap">
                        <ThemeIcon className="shrink-0 self-center" color="brand.5" radius="xl" size={28} variant="light">
                          <IconShieldLock size={15} />
                        </ThemeIcon>
                        <Stack className="flex-1" gap={2}>
                          <Text className="text-[0.94rem] text-center sm:text-left" fw={700}>
                            Ambiente controlado para a operação interna
                          </Text>
                          <Text c="dimmed" className="text-center text-[0.8rem] leading-5 sm:text-left" size="sm">
                            O acesso direciona a equipe para uma rotina organizada, segura e preparada para operação diária.
                          </Text>
                        </Stack>
                      </Group>

                      <div className="grid gap-2.5">
                        {accessHighlights.map((item) => (
                          <Group key={item} className="rounded-2xl bg-white px-3.5 py-2.5" wrap="nowrap">
                            <ThemeIcon color="brand.5" radius="xl" size={28} variant="light">
                              <IconCircleCheck size={15} />
                            </ThemeIcon>
                            <Text className="text-[0.8rem] leading-5 text-slate-600" size="sm">
                              {item}
                            </Text>
                          </Group>
                        ))}
                      </div>
                    </Stack>
                  </div>
                </Stack>
              </AppCard>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  )
}
