"use client"

import { useEffect, useState, useRef } from "react"
import { config } from "@/lib/config"
import type { RealtimeMetrics } from "@/lib/types"

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

    // Configurar polling usando configuração centralizada
    intervalRef.current = setInterval(fetchMetrics, config.realtime.updateInterval)

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
