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
    md: '0 14px 42px rgba(8, 18, 41, 0.07)',
    xl: '0 22px 64px rgba(8, 18, 41, 0.1)',
  },
  components: {
    Notification: {
      defaultProps: {
        radius: 'xl',
        withBorder: false,
      },
      styles: {
        root: {
          background: 'rgba(255, 255, 255, 0.97)',
          border: '1px solid rgba(226, 232, 240, 0.86)',
          boxShadow: '0 24px 70px rgba(15, 23, 42, 0.11)',
          padding: '0.95rem 1rem',
        },
        icon: {
          width: '2.6rem',
          height: '2.6rem',
          minWidth: '2.6rem',
          borderRadius: '999px',
        },
        title: {
          color: '#0f172a',
          fontSize: '1rem',
          fontWeight: 700,
          lineHeight: 1.2,
        },
        description: {
          color: '#64748b',
          fontSize: '0.94rem',
          lineHeight: 1.55,
        },
        closeButton: {
          color: '#94a3b8',
        },
      },
    },
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
        size: 'md',
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: 'xl',
        size: 'md',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'xl',
        size: 'sm',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'xl',
        centered: true,
        overlayProps: {
          blur: 2,
          opacity: 0.36,
        },
        padding: 'md',
      },
      styles: {
        content: {
          border: '1px solid rgba(226, 232, 240, 0.8)',
          boxShadow: '0 24px 80px rgba(15, 23, 42, 0.12)',
        },
        title: {
          color: '#0f172a',
          fontSize: '1.05rem',
          fontWeight: 700,
        },
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'lg',
        size: 'md',
      },
    },
    Select: {
      defaultProps: {
        radius: 'lg',
        size: 'md',
      },
    },
    NumberInput: {
      defaultProps: {
        radius: 'lg',
        size: 'md',
      },
    },
    FileInput: {
      defaultProps: {
        radius: 'lg',
        size: 'md',
      },
    },
    Textarea: {
      defaultProps: {
        radius: 'lg',
        size: 'md',
      },
    },
  },
})


export function AppProviders({ children }: PropsWithChildren) {
  return (
    <MantineProvider theme={theme} forceColorScheme="light">
      <Notifications limit={4} position="top-right" zIndex={260} />
      <AuthProvider>
        <LookupsProvider>
          <ModalsProvider
            modalProps={{
              centered: true,
              overlayProps: {
                blur: 2,
                opacity: 0.36,
              },
              padding: 'lg',
              radius: 'xl',
            }}
          >
            {children}
          </ModalsProvider>
        </LookupsProvider>
      </AuthProvider>
    </MantineProvider>
  )
}
