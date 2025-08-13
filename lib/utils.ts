import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { config } from "./config"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatação de tempo de resposta
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

// Cores para badges de tempo de resposta
export function getResponseTimeBadgeColor(seconds: number): string {
  const { responseTimeThreshold } = config.metrics
  
  if (seconds <= responseTimeThreshold.fast) {
    return "bg-green-100 text-green-800 border-green-200"
  } else if (seconds <= responseTimeThreshold.normal) {
    return "bg-yellow-100 text-yellow-800 border-yellow-200"
  } else if (seconds <= responseTimeThreshold.slow) {
    return "bg-orange-100 text-orange-800 border-orange-200"
  } else {
    return "bg-red-100 text-red-800 border-red-200"
  }
}

// Categorização de tempo de resposta
export function getResponseTimeCategory(seconds: number): string {
  const { responseTimeThreshold } = config.metrics
  
  if (seconds <= responseTimeThreshold.fast) {
    return "Rápido"
  } else if (seconds <= responseTimeThreshold.normal) {
    return "Normal"
  } else if (seconds <= responseTimeThreshold.slow) {
    return "Lento"
  } else {
    return "Muito Lento"
  }
}

// Formatação de data
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}

// Formatação de número
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("pt-BR").format(num)
}

// Validação de dados
export function isValidConversationId(id: string): boolean {
  return id && id.trim().length > 0
}

export function isValidAgentName(name: string): boolean {
  return name && name.trim().length > 0 && name !== "Sistema"
}

// Limpeza de dados
export function sanitizeString(str: string): string {
  return str.trim().replace(/\s+/g, ' ')
}
