import { AppShell, Box } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Outlet } from 'react-router-dom'

import { AppCard } from '@/components/ui/app-card'
import { Header } from './header'
import { Sidebar } from './sidebar'


export function AppShellLayout() {
  const [opened, { toggle, close }] = useDisclosure(false)

  return (
    <AppShell
      header={{ height: 118 }}
      navbar={{
        width: 320,
        breakpoint: 'md',
        collapsed: {
          mobile: !opened,
        },
      }}
      padding="md"
    >
      <AppShell.Header className="border-none bg-transparent px-4 pt-4">
        <AppCard className="h-full">
          <Header onToggle={toggle} opened={opened} />
        </AppCard>
      </AppShell.Header>
      <AppShell.Navbar className="border-none bg-transparent px-4 pb-4 pt-[7.8rem]">
        <Sidebar />
      </AppShell.Navbar>
      <AppShell.Main className="bg-transparent">
        <Box
          className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.13),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.12),_transparent_24%),linear-gradient(180deg,#f5f8ff_0%,#eef3fb_100%)] px-0 pb-6 pt-[7.8rem]"
          onClick={close}
        >
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 md:px-6">
            <Outlet />
          </div>
        </Box>
      </AppShell.Main>
    </AppShell>
  )
}
