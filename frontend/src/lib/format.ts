import { format } from 'date-fns'

export function formatDate(value: string) {
  return format(new Date(value), 'dd MMM yyyy')
}

export function formatDateTime(value: string) {
  return format(new Date(value), 'dd MMM yyyy, hh:mm a')
}

export function formatRange(startDate: string, endDate: string) {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

export function toLabelCase(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
