import { DatabaseService } from "@/lib/database"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { conversationId: string } }) {
  try {
    const responseTimes = await DatabaseService.getConversationResponseTimes(params.conversationId)
    return NextResponse.json(responseTimes)
  } catch (error) {
    console.error("Erro ao buscar tempos de resposta:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
