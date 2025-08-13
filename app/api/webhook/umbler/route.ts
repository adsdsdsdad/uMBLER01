import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("🔄 Webhook Umbler recebido:", JSON.stringify(body, null, 2))

    const { Type, EventDate, Payload, EventId } = body

    if (!Type || !Payload || !EventId) {
      return NextResponse.json(
        {
          error: "Formato inválido. Esperado: Type, EventDate, Payload, EventId",
        },
        { status: 400 },
      )
    }

    // Processar apenas eventos de mensagem por enquanto
    if (Type === "Message" && Payload.Type === "Chat") {
      const chatData = Payload.Content
      const lastMessage = chatData.LastMessage

      if (!chatData.Id || !lastMessage) {
        return NextResponse.json(
          {
            error: "Dados de chat ou mensagem ausentes",
          },
          { status: 400 },
        )
      }

      console.log("🔍 === DEBUG IDENTIFICAÇÃO SENDER ===")
      console.log("📝 lastMessage.Source:", lastMessage.Source)
      console.log("📝 lastMessage.Source (lowercase):", lastMessage.Source?.toLowerCase())
      console.log("👤 chatData.Contact.Name:", chatData.Contact?.Name)
      console.log("🎧 chatData.OrganizationMember.Name:", chatData.OrganizationMember?.Name)
      console.log("🎧 lastMessage.Member.Name:", lastMessage.Member?.Name)

      const conversation_id = chatData.Id
      const customer_name = chatData.Contact?.Name || "Cliente"
      const customer_phone = chatData.Contact?.Phone || null
      const customer_email = chatData.Contact?.Email || null

      const agent_name = chatData.OrganizationMember?.Name || lastMessage.Member?.Name || "Sistema"

      const message_text = lastMessage.Content || "🎵 Mensagem de áudio"
      const isSiteCustomer = message_text.toLowerCase().includes("olá, vim do site do marcelino")

      console.log("🌐 === DETECÇÃO CLIENTE SITE ===")
      console.log("📝 Mensagem:", message_text.substring(0, 100))
      console.log("🔍 É cliente do site?", isSiteCustomer ? "✅ SIM" : "❌ NÃO")
      console.log("===============================")

      // Criar ou atualizar conversa
      await DatabaseService.createOrUpdateConversation({
        conversation_id,
        customer_name,
        customer_phone,
        customer_email,
        agent_name,
        is_site_customer: isSiteCustomer, // Adicionar flag de cliente do site
      })

      const message_id = lastMessage.Id || EventId

      const sourceValue = lastMessage.Source?.toLowerCase()
      const sender_type = sourceValue === "contact" ? "customer" : "agent"

      let sender_name = sender_type === "customer" ? customer_name : agent_name

      // Se for mensagem de agente, tentar pegar o nome específico do membro que enviou
      if (sender_type === "agent") {
        // Tentar múltiplas fontes para o nome do agente
        const agentFromMessage = lastMessage.Member?.Name
        const agentFromChat = chatData.OrganizationMember?.Name
        const agentFromPayload = Payload.Content?.OrganizationMember?.Name

        sender_name = agentFromMessage || agentFromChat || agentFromPayload || agent_name || "Atendente"

        console.log("🎧 === DEBUG NOME ATENDENTE ===")
        console.log("📝 lastMessage.Member?.Name:", agentFromMessage)
        console.log("📝 chatData.OrganizationMember?.Name:", agentFromChat)
        console.log("📝 Payload.Content?.OrganizationMember?.Name:", agentFromPayload)
        console.log("📝 agent_name (fallback):", agent_name)
        console.log("✅ sender_name final:", sender_name)
        console.log("===============================")
      } else {
        // Para cliente, garantir que sempre tenha um nome
        sender_name = customer_name || "Cliente"
      }

      const message_type = lastMessage.IsPrivate ? "private_note" : "message"
      const timestamp = new Date(EventDate)

      console.log("✅ === RESULTADO IDENTIFICAÇÃO ===")
      console.log(`📊 Source original: "${lastMessage.Source}"`)
      console.log(`📊 Source normalizado: "${sourceValue}"`)
      console.log(`📊 sender_type: "${sender_type}"`)
      console.log(`👤 sender_name: "${sender_name}"`)
      console.log(`💬 message_text: "${message_text.substring(0, 50)}..."`)
      console.log(`🌐 is_site_customer: ${isSiteCustomer}`)
      console.log("=====================================")

      const savedMessage = await DatabaseService.createMessage({
        conversation_id,
        message_id,
        sender_type: sender_type as "customer" | "agent",
        sender_name,
        message_text,
        message_type,
        timestamp,
      })

      console.log("💾 Mensagem salva no banco:", savedMessage ? "✅ Sucesso" : "❌ Falhou")

      if (sender_type === "agent" && !lastMessage.IsPrivate) {
        console.log("⏱️ === CALCULANDO TEMPO DE RESPOSTA ===")
        console.log(`📝 Mensagem do agente: ${sender_name}`)
        console.log(`📝 EventDate da resposta: ${EventDate}`)
        console.log(`📝 Conversa: ${conversation_id}`)

        // Buscar a última mensagem do cliente nesta conversa
        const lastCustomerMessage = await DatabaseService.getLastCustomerMessage(conversation_id)

        if (lastCustomerMessage) {
          const customerMessageTime = new Date(lastCustomerMessage.timestamp)
          const agentResponseTime = new Date(EventDate)
          const responseTimeSeconds = Math.floor((agentResponseTime.getTime() - customerMessageTime.getTime()) / 1000)

          console.log(`📊 Última mensagem cliente: ${lastCustomerMessage.timestamp}`)
          console.log(`📊 Resposta do agente: ${EventDate}`)
          console.log(
            `⏱️ Tempo de resposta: ${responseTimeSeconds}s (${Math.floor(responseTimeSeconds / 60)}min ${responseTimeSeconds % 60}s)`,
          )

          if (responseTimeSeconds > 0) {
            // Salvar tempo de resposta
            await DatabaseService.saveResponseTime({
              conversation_id,
              customer_message_id: lastCustomerMessage.message_id,
              agent_message_id: message_id,
              response_time_seconds: responseTimeSeconds,
              customer_message_time: customerMessageTime,
              agent_response_time: agentResponseTime,
            })

            console.log(
              `✅ Tempo de resposta salvo: ${Math.floor(responseTimeSeconds / 60)}min ${responseTimeSeconds % 60}s`,
            )
          } else {
            console.log("⚠️ Tempo de resposta inválido (negativo ou zero)")
          }
        } else {
          console.log("ℹ️ Nenhuma mensagem de cliente encontrada para calcular tempo de resposta")
        }
        console.log("==========================================")
      }

      console.log(
        `🎉 Mensagem processada - Conversa: ${conversation_id}, Sender: ${sender_type}, Site Customer: ${isSiteCustomer}`,
      )

      return NextResponse.json({
        success: true,
        message: "Webhook processado com sucesso",
        event_type: Type,
        conversation_id,
        sender_type,
        sender_name,
        is_site_customer: isSiteCustomer,
        event_id: EventId,
        processed_at: new Date().toISOString(),
      })
    }

    if (Type === "ChatClosed") {
      const conversation_id = Payload.Content.Id
      // Atualizar status da conversa para fechada
      await DatabaseService.updateConversationStatus(conversation_id, "closed")

      console.log(`✅ Chat fechado - Conversa: ${conversation_id}`)

      return NextResponse.json({
        success: true,
        message: "Chat fechado processado",
        event_type: Type,
        conversation_id,
        event_id: EventId,
      })
    }

    if (Type === "MemberTransfer") {
      const conversation_id = Payload.Content.Id
      const new_agent = Payload.Content.OrganizationMember?.Name || "Sistema"

      // Atualizar agente responsável
      await DatabaseService.updateConversationAgent(conversation_id, new_agent)

      console.log(`✅ Transferência processada - Conversa: ${conversation_id}, Novo agente: ${new_agent}`)

      return NextResponse.json({
        success: true,
        message: "Transferência processada",
        event_type: Type,
        conversation_id,
        new_agent,
        event_id: EventId,
      })
    }

    // Outros tipos de evento (ChatSectorChanged, ChatPrivateStatusChanged)
    console.log(`ℹ️ Evento recebido mas não processado: ${Type}`)

    return NextResponse.json({
      success: true,
      message: `Evento ${Type} recebido mas não processado`,
      event_type: Type,
      event_id: EventId,
    })
  } catch (error) {
    console.error("❌ Erro ao processar webhook Umbler:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Webhook endpoint da Umbler está funcionando",
    timestamp: new Date().toISOString(),
    expected_format: {
      Type: "Message | ChatClosed | MemberTransfer | ChatSectorChanged | ChatPrivateStatusChanged",
      EventDate: "2024-02-07T18:44:01.3135533Z",
      Payload: {
        Type: "Chat",
        Content: "BasicChatModel object",
      },
      EventId: "ZcPPcWpimiD3EiER",
    },
  })
}
