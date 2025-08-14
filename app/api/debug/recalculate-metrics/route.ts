import { DatabaseService } from "@/lib/database"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    console.log("🔄 Iniciando recálculo de métricas...")
    
    const totalProcessed = await DatabaseService.recalculateAllMetrics()
    
    return NextResponse.json({
      success: true,
      message: `Métricas recalculadas para ${totalProcessed} conversas`,
      total_processed: totalProcessed,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro ao recalcular métricas:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST para recalcular métricas de todas as conversas",
    endpoint: "/api/debug/recalculate-metrics",
    method: "POST",
  })
}