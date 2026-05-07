const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})


export function formatDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  return dateFormatter.format(new Date(value))
}


export function formatDateTime(value?: string | null) {
  if (!value) {
    return '-'
  }

  return dateTimeFormatter.format(new Date(value))
}


export function formatNullable(value?: string | null) {
  return value?.trim() ? value : '-'
}
