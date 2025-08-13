"use client"

import { useEffect, useState, useRef } from "react"

interface RealtimeMetrics {
  conversation_id: string
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  agent_name?: string
  status: string
  is_site_customer?: boolean
  total_messages: number
  customer_messages: number
  agent_messages: number
  avg_response_time: number
  min_response_time: number
  max_response_time: number
  created_at: string
  updated_at: string
}

interface UseRealtimeMetricsReturn {
  metrics: RealtimeMetrics[]
  isConnected: boolean
  lastUpdate: Date | null
  error: string | null
}

export function useRealtimeMetrics(): UseRealtimeMetricsReturn {
  const [metrics, setMetrics] = useState<RealtimeMetrics[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!isActiveRef.current) return

      try {
        console.log("Buscando métricas...")
        const response = await fetch("/api/events")

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        if (data.success) {
          setMetrics(data.data || [])
          setLastUpdate(new Date(data.timestamp))
          setIsConnected(true)
          setError(null)
          console.log(`Métricas atualizadas: ${data.count} conversas`)

          if (data.note) {
            console.log("Nota:", data.note)
          }
        } else {
          throw new Error("Resposta inválida do servidor")
        }
      } catch (err) {
        console.error("Erro ao buscar métricas:", err)
        setIsConnected(false)
        setError(err instanceof Error ? err.message : "Erro desconhecido")
      }
    }

    // Buscar métricas imediatamente
    fetchMetrics()

    // Configurar polling a cada 10 segundos
    intervalRef.current = setInterval(fetchMetrics, 10000)

    return () => {
      isActiveRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsConnected(false)
    }
  }, [])

  return {
    metrics,
    isConnected,
    lastUpdate,
    error,
  }
}
