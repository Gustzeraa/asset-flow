export function toFormData(values: Record<string, unknown>) {
  const formData = new FormData()

  Object.entries(values).forEach(([key, value]) => {
    if (value instanceof File) {
      formData.append(key, value)
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(key, String(item ?? '')))
      return
    }

    if (value === undefined) {
      return
    }

    if (value === null) {
      formData.append(key, '')
      return
    }

    formData.append(key, String(value))
  })

  return formData
}
