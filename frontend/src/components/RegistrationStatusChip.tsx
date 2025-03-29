interface RegistrationStatusChipProps {
  status: string
}

const RegistrationStatusChip = ({ status }: RegistrationStatusChipProps) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'inprogress':
        return 'bg-blue-100 text-blue-800'
      case 'new':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'Angenommen'
      case 'inprogress':
        return 'In Bearbeitung'
      case 'new':
        return 'Neu'
      case 'rejected':
        return 'Abgelehnt'
      default:
        return status
    }
  }

  return (
    <span
      className={`text-xs inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${getStatusColor(status)}`}>
      {getStatusText(status)}
    </span>
  )
}

export default RegistrationStatusChip
