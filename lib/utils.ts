import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatResponseTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }
}

export function getResponseTimeColor(seconds: number): string {
  if (seconds <= 30) return "text-green-600"
  if (seconds <= 120) return "text-blue-600"
  if (seconds <= 300) return "text-yellow-600"
  return "text-red-600"
}

export function getResponseTimeBadgeColor(seconds: number): string {
  if (seconds <= 30) return "bg-green-100 text-green-800"
  if (seconds <= 120) return "bg-blue-100 text-blue-800"
  if (seconds <= 300) return "bg-yellow-100 text-yellow-800"
  return "bg-red-100 text-red-800"
}

export function isOutsideBusinessHours(date: Date): boolean {
  const hour = date.getHours()
  const dayOfWeek = date.getDay() // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  
  // Horário de atendimento: Segunda a Sexta, 8h às 18h
  // Sábado: 8h às 12h
  // Domingo: Fechado
  
  if (dayOfWeek === 0) { // Domingo
    return true
  }
  
  if (dayOfWeek === 6) { // Sábado
    return hour < 8 || hour >= 12
  }
  
  // Segunda a Sexta
  return hour < 8 || hour >= 18
}

export function getBusinessHoursStatus(customerMessageTime: Date, agentResponseTime: Date): {
  isOutsideHours: boolean
  customerOutsideHours: boolean
  agentOutsideHours: boolean
  status: string
} {
  const customerOutsideHours = isOutsideBusinessHours(customerMessageTime)
  const agentOutsideHours = isOutsideBusinessHours(agentResponseTime)
  
  let status = "Dentro do horário"
  let isOutsideHours = false
  
  if (customerOutsideHours && agentOutsideHours) {
    status = "Ambos fora do horário"
    isOutsideHours = true
  } else if (customerOutsideHours) {
    status = "Cliente fora do horário"
    isOutsideHours = true
  } else if (agentOutsideHours) {
    status = "Atendente fora do horário"
    isOutsideHours = true
  }
  
  return {
    isOutsideHours,
    customerOutsideHours,
    agentOutsideHours,
    status
  }
}
