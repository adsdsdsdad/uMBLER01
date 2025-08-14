import { DatabaseService } from "@/lib/database"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { conversationId: string } }) {
  try {
    const messages = await DatabaseService.getMessagesWithResponseTimes(params.conversationId)
    return NextResponse.json(messages)
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
