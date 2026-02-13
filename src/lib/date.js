export function getTodayDate() {
  const now = new Date()
  return toDateInputValue(now)
}

export function toDateInputValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(dateInput, days) {
  const [year, month, day] = dateInput.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return toDateInputValue(date)
}

export function formatDateLabel(dateInput) {
  const [year, month, day] = dateInput.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return new Intl.DateTimeFormat('pt-PT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function formatAuditTimestamp(timestampLike) {
  if (!timestampLike) {
    return ''
  }

  let value = timestampLike
  if (typeof timestampLike.toDate === 'function') {
    value = timestampLike.toDate()
  } else if (timestampLike.seconds) {
    value = new Date(timestampLike.seconds * 1000)
  } else {
    value = new Date(timestampLike)
  }

  if (Number.isNaN(value.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}
