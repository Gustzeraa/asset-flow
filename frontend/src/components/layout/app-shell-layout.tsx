import { Box, Drawer } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { Header } from './header'
import { Sidebar } from './sidebar'


export function AppShellLayout() {
  const [opened, { toggle, close }] = useDisclosure(false)
  const location = useLocation()

  useEffect(() => {
    close()
  }, [close, location.pathname])

  return (
    <Box className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.13),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.12),_transparent_24%),linear-gradient(180deg,#f5f8ff_0%,#eef3fb_100%)]">
      <div className="mx-auto flex min-h-screen w-full">
        <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 border-r border-slate-950/8 bg-[linear-gradient(180deg,#081224_0%,#0e2240_44%,#102b54_100%)] px-3.5 py-4.5 text-white lg:block">
          <Sidebar />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-30 border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,255,0.92)_0%,rgba(241,246,255,0.84)_100%)] backdrop-blur-xl">
            <div className="mx-auto flex w-full px-2.5 py-2.5 md:px-4 md:py-3">
              <Header onToggle={toggle} opened={opened} />
            </div>
          </div>

          <Box className="flex-1 px-2.5 pb-4 pt-4 md:px-4 md:pb-6">
            <div className="mx-auto flex w-full flex-col gap-4">
              <Outlet />
            </div>
          </Box>
        </div>
      </div>

      <Drawer
        hiddenFrom="lg"
        onClose={close}
        opened={opened}
        overlayProps={{ blur: 10, opacity: 0.24 }}
        padding={0}
        size="86vw"
        styles={{
          body: {
            height: '100%',
            padding: '1.25rem 1rem',
          },
          content: {
            background: 'linear-gradient(180deg, #081224 0%, #0e2240 44%, #102b54 100%)',
          },
        }}
        withCloseButton={false}
      >
        <div className="h-full">
          <Sidebar onNavigate={close} />
        </div>
      </Drawer>
    </Box>
  )
}