import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/jetbrains-mono/500.css'
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'

import { MantineProvider, createTheme } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import type { PropsWithChildren } from 'react'

import { AuthProvider } from './auth-context'
import { LookupsProvider } from './lookups-context'

dayjs.locale('pt-br')

const theme = createTheme({
  fontFamily: 'Manrope, sans-serif',
  fontFamilyMonospace: '"JetBrains Mono", monospace',
  primaryColor: 'brand',
  defaultRadius: 'lg',
  white: '#ffffff',
  black: '#070b14',
  colors: {
    brand: ['#edf4ff', '#dbe9ff', '#bfd7ff', '#98bdff', '#6a9cff', '#4678ff', '#315be7', '#2647bd', '#1c3775', '#122551'],
  },
  headings: {
    fontFamily: 'Manrope, sans-serif',
    fontWeight: '700',
  },
  shadows: {
    md: '0 18px 60px rgba(8, 18, 41, 0.08)',
    xl: '0 28px 90px rgba(8, 18, 41, 0.12)',
  },
  components: {
    Paper: {
      defaultProps: {
        radius: 'xl',
      },
    },
    Card: {
      defaultProps: {
        radius: 'xl',
      },
    },
    Button: {
      defaultProps: {
        radius: 'xl',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'xl',
        centered: true,
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Select: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Textarea: {
      defaultProps: {
        radius: 'lg',
      },
    },
  },
})


export function AppProviders({ children }: PropsWithChildren) {
  return (
    <MantineProvider theme={theme} forceColorScheme="light">
      <Notifications position="top-right" />
      <AuthProvider>
        <LookupsProvider>
          <ModalsProvider>{children}</ModalsProvider>
        </LookupsProvider>
      </AuthProvider>
    </MantineProvider>
  )
}
