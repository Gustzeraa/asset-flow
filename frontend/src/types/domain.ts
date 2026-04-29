export type ApiOption = {
  value: string
  label: string
}

export type User = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_superuser: boolean
}

export type Category = {
  id: number
  nome: string
  equipamentos_count?: number
}

export type CollaboratorSummary = {
  id: number
  nome: string
  cargo: string
  departamento: string
  email: string
  ativo: boolean
}

export type EquipmentSummary = {
  id: number
  nome: string
  num_patrimonio: string
  status: string
  status_label: string
}

export type Equipment = {
  id: number
  data: string | null
  nome: string
  num_patrimonio: string
  categoria_id: number | null
  categoria: Category | null
  local: string | null
  tipo: string | null
  departamento: string | null
  descricao: string | null
  status: string
  status_label: string
  responsavel_id: number | null
  responsavel: CollaboratorSummary | null
  validador_id: number | null
  validador: CollaboratorSummary | null
  observacao: string | null
  foto_url: string | null
  excluido: boolean
}

export type Collaborator = {
  id: number
  nome: string
  cpf: string | null
  cargo: string
  email: string
  departamento: string
  ativo: boolean
  excluido: boolean
  ativos_count: number
  ativos: EquipmentSummary[]
}

export type Consumable = {
  id: number
  nome: string
  unidade_medida: string
  unidade_medida_label: string
  quantidade_atual: number
  estoque_minimo: number
  descricao: string | null
  estoque_baixo: boolean
  excluido: boolean
}

export type Movement = {
  id: number
  consumivel_id: number
  consumivel_nome: string
  tipo: string
  tipo_label: string
  quantidade: number
  data: string
  responsavel: CollaboratorSummary | null
  destino: string
  observacao: string
}

export type TrashItem = {
  id: number
  tipo: 'equipamento' | 'consumivel' | 'colaborador'
  nome: string
  detalhe: string
  badge: string
}

export type DashboardData = {
  totais: {
    equipamentos: number
    equipamentos_disponiveis: number
    equipamentos_em_uso: number
    equipamentos_manutencao: number
    colaboradores_ativos: number
    consumiveis: number
  }
  alertas_estoque: Consumable[]
  equipamentos_recentes: Equipment[]
  movimentacoes_recentes: Movement[]
}

export type Lookups = {
  categorias: Category[]
  colaboradores: CollaboratorSummary[]
  equipamento_status: ApiOption[]
  consumivel_unidades: ApiOption[]
  movimentacao_tipos: ApiOption[]
}
