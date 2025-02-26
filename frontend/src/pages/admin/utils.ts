const formatDate = (value: string | number) =>
  new Date(String(value))
    .toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(',', '')

export const formatValue = (key: string, value: string | number | boolean) => {
  if (key === 'createdAt' || key === 'updatedAt') {
    return formatDate(String(value))
  } else if (key === 'status') {
    switch (String(value)) {
      case 'new':
        return 'Neu'
      case 'inProgress':
        return 'In Bearbeitung'
      case 'approved':
        return 'Angenommen'
      case 'rejected':
        return 'Abgelehnt'
      default:
        return String(value)
    }
  } else if (typeof value === 'boolean') {
    return value ? 'Ja' : 'Nein'
  } else {
    return value
  }
}

export const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}
