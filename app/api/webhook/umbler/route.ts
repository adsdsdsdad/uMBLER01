// ARQUIVO: app/api/webhook/umbler/route.ts
// Webhook principal para integração com a Umbler

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

      const conversation_id = chatData.Id
      const customer_name = chatData.Contact?.Name || "Cliente"
      const customer_phone = chatData.Contact?.Phone || null
      const customer_email = chatData.Contact?.Email || null

      // Lógica robusta para determinar o tipo de remetente
      const sourceValue = (lastMessage.Source || "").toLowerCase().trim()
      let sender_type: "customer" | "agent"
      
      if (sourceValue === "contact" || sourceValue === "customer") {
        sender_type = "customer"
      } else if (sourceValue === "agent" || sourceValue === "member" || sourceValue === "organizationmember") {
        sender_type = "agent"
      } else {
        // Fallback: verificar se há dados de membro/organização
        const hasMemberData = lastMessage.Member?.Name || chatData.OrganizationMember?.Name
        sender_type = hasMemberData ? "agent" : "customer"
      }

      // Captura robusta do nome do agente
      let agent_name = "Atendente"
      let sender_name: string

      if (sender_type === "agent") {
        // Para mensagens de agente, usar o nome do remetente
        const sources = {
          memberName: lastMessage.Member?.Name,
          memberDisplayName: lastMessage.Member?.DisplayName,
          orgMemberName: chatData.OrganizationMember?.Name,
          orgMemberDisplayName: chatData.OrganizationMember?.DisplayName,
          payloadMemberName: Payload.Content?.OrganizationMember?.Name,
        }

        agent_name = sources.memberName ||
                    sources.memberDisplayName ||
                    sources.orgMemberName ||
                    sources.orgMemberDisplayName ||
                    sources.payloadMemberName ||
                    "Atendente"

        sender_name = agent_name
      } else {
        // Para mensagens de cliente, manter o agente responsável
        sender_name = customer_name
        
        const possibleAgentNames = [
          chatData.OrganizationMember?.Name,
          chatData.OrganizationMember?.DisplayName,
          Payload.Content?.OrganizationMember?.Name,
          Payload.Content?.OrganizationMember?.DisplayName,
          "Atendente"
        ]
        
        agent_name = possibleAgentNames.find(name => name && name.trim() !== "") || "Atendente"
        
        // Garantir que agent_name nunca seja vazio
        if (!agent_name || agent_name.trim() === "") {
          agent_name = "Atendente"
        }
        
        // Nunca usar "Sistema" como nome de agente
        if (agent_name === "Sistema") {
          agent_name = "Atendente"
        }
      }

      const message_text = lastMessage.Content || "🎵 Mensagem de áudio"
      const isSiteCustomer = message_text.toLowerCase().includes("olá, vim do site do marcelino")

      // Criar ou atualizar conversa
      const savedConversation = await DatabaseService.createOrUpdateConversation({
        conversation_id,
        customer_name,
        customer_phone,
        customer_email,
        agent_name,
        is_site_customer: isSiteCustomer,
      })

      const message_id = lastMessage.Id || EventId
      const message_type = lastMessage.IsPrivate ? "private_note" : "message"
      const timestamp = new Date(EventDate)

      const savedMessage = await DatabaseService.createMessage({
        conversation_id,
        message_id,
        sender_type: sender_type as "customer" | "agent",
        sender_name,
        message_text,
        message_type,
        timestamp,
      })

      // Calcular tempo de resposta se for mensagem de agente
      if (sender_type === "agent" && !lastMessage.IsPrivate) {
        const lastCustomerMessage = await DatabaseService.getLastCustomerMessage(conversation_id)

        if (lastCustomerMessage) {
          const customerMessageTime = new Date(lastCustomerMessage.timestamp)
          const agentResponseTime = new Date(EventDate)
          const responseTimeSeconds = Math.floor((agentResponseTime.getTime() - customerMessageTime.getTime()) / 1000)

          if (responseTimeSeconds > 0) {
            await DatabaseService.saveResponseTime({
              conversation_id,
              customer_message_id: lastCustomerMessage.message_id,
              agent_message_id: message_id,
              response_time_seconds: responseTimeSeconds,
              customer_message_time: customerMessageTime,
              agent_response_time: agentResponseTime,
            })
          }
        }
      }

      console.log(
        `🎉 Mensagem processada - Conversa: ${conversation_id}, Sender: ${sender_type}, Agente: ${agent_name}`,
      )

      return NextResponse.json({
        success: true,
        message: "Webhook processado com sucesso",
        event_type: Type,
        conversation_id,
        sender_type,
        sender_name,
        agent_name,
        is_site_customer: isSiteCustomer,
        event_id: EventId,
        processed_at: new Date().toISOString(),
      })
    }

    // Processar outros tipos de evento
    if (Type === "ChatClosed") {
      const conversation_id = Payload.Content.Id
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
      const new_agent = Payload.Content.OrganizationMember?.Name || "Atendente"
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
