import { useState, useEffect } from 'react'
import { 
  Title, Text, Paper, Table, Group, Button, ActionIcon, Badge, TextInput, Box, Loader, Center, Stack, Modal, Select, PasswordInput 
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconUserPlus, IconSearch, IconEdit, IconTrash, IconShieldLock } from '@tabler/icons-react'

// 🚀 Usamos o utilitário padrão e o contexto de autenticação
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/app/auth-context'

interface User {
  id: number
  name: string
  email: string
  role: string
  status: string
}

export function UsersPage() {
  const { isLoading: isAuthLoading } = useAuth() // 🛡️ Monitoramos se a sessão está a ser restaurada
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [opened, { open, close }] = useDisclosure(false)
  const [isEditing, setIsEditing] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'operador',
    status: 'ativo',
    password: ''
  })

  async function fetchUsers() {
    try {
      setLoading(true)
      // 🚀 USAR CAMINHO RELATIVO: O apiFetch precisa disso para gerir o CSRF e a sessão pelo proxy do Vite
      const data = await apiFetch<User[]>('/api/users/')
      
      if (Array.isArray(data)) {
        setUsers(data)
      }
    } catch (error) {
      console.error("Erro ao buscar usuários:", error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  // 🚀 Só dispara a busca quando a restauração da sessão (F5) terminar
  useEffect(() => {
    if (!isAuthLoading) {
      fetchUsers()
    }
  }, [isAuthLoading])

  const handleOpenCreate = () => {
    setIsEditing(null)
    setFormData({ name: '', email: '', role: 'operador', status: 'ativo', password: '' })
    open()
  }

  const handleOpenEdit = (user: User) => {
    setIsEditing(user.id)
    setFormData({ 
      name: user.name, 
      email: user.email, 
      role: user.role, 
      status: user.status, 
      password: '' 
    })
    open()
  }

  const handleSave = async () => {
    try {
      const method = isEditing ? 'PUT' : 'POST'
      const url = isEditing ? `/api/users/${isEditing}/` : '/api/users/'
      
      await apiFetch(url, {
        method,
        body: JSON.stringify(formData)
      })
      
      close()
      fetchUsers()
    } catch (error) {
      alert("Erro ao processar solicitação. Verifique os dados.")
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Deseja mesmo remover o acesso de ${name}?`)) {
      try {
        await apiFetch(`/api/users/${id}/`, { method: 'DELETE' })
        fetchUsers()
      } catch (error) {
        alert("Erro ao excluir.")
      }
    }
  }

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(search.toLowerCase()) || 
    user.email.toLowerCase().includes(search.toLowerCase())
  )

  // 🛡️ Se o sistema ainda estiver a restaurar a sua conta (F5), mostramos o loader global
  if (isAuthLoading || loading) {
    return (
      <Center h={400}>
        <Stack align="center">
          <Loader size="lg" />
          <Text c="dimmed">Sincronizando dados com o servidor...</Text>
        </Stack>
      </Center>
    )
  }

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2} fw={800}>Gestão de Usuários</Title>
          <Text c="dimmed" size="sm">Controle de acessos e permissões do sistema ICTQ</Text>
        </div>
        <Button leftSection={<IconUserPlus size={18} />} onClick={handleOpenCreate}>
          Adicionar Usuário
        </Button>
      </Group>

      <Paper radius="xl" p="md" withBorder shadow="md">
        <Group mb="md">
          <TextInput
            placeholder="Pesquisar..."
            leftSection={<IconSearch size={16} />}
            style={{ flex: 1 }}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
        </Group>

        <Table.ScrollContainer minWidth={800}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Usuário</Table.Th>
                <Table.Th>E-mail</Table.Th>
                <Table.Th>Perfil</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th style={{ width: 100 }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredUsers.map((user) => (
                <Table.Tr key={user.id}>
                  <Table.Td fw={600}>{user.name}</Table.Td>
                  <Table.Td>{user.email}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <IconShieldLock size={14} color={user.role === 'admin' ? '#228be6' : '#868e96'} />
                      <Text size="sm" tt="capitalize">{user.role}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={user.status === 'ativo' ? 'green' : 'red'} variant="light">
                      {user.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <ActionIcon variant="subtle" color="blue" onClick={() => handleOpenEdit(user)}>
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(user.id, user.name)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      <Modal opened={opened} onClose={close} title={<Text fw={700}>{isEditing ? 'Editar' : 'Novo'}</Text>} radius="md">
        <Stack gap="md">
          <TextInput label="Usuário" value={formData.name} onChange={(e) => setFormData({...formData, name: e.currentTarget.value})} required />
          <TextInput label="E-mail" value={formData.email} onChange={(e) => setFormData({...formData, email: e.currentTarget.value})} required />
          <Select label="Perfil" data={[{ value: 'admin', label: 'Admin' }, { value: 'operador', label: 'Operador' }]} value={formData.role} onChange={(v) => setFormData({...formData, role: v || 'operador'})} />
          <Select label="Estado" data={[{ value: 'ativo', label: 'Ativo' }, { value: 'inativo', label: 'Inativo' }]} value={formData.status} onChange={(v) => setFormData({...formData, status: v || 'ativo'})} />
          <PasswordInput label={isEditing ? "Nova Senha (opcional)" : "Senha"} value={formData.password} onChange={(e) => setFormData({...formData, password: e.currentTarget.value})} />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={close}>Cancelar</Button>
            <Button onClick={handleSave}>Confirmar</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  )
}