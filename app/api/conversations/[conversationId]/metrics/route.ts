import { DatabaseService } from "@/lib/database"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { conversationId: string } }) {
  try {
    const metrics = await DatabaseService.getConversationMetrics(params.conversationId)
    return NextResponse.json(metrics)
  } catch (error) {
    console.error("Erro ao buscar métricas da conversa:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}