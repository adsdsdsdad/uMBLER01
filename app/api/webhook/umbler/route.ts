// ARQUIVO: app/api/webhook/umbler/route.ts
// SUBSTITUA as seções marcadas abaixo:

import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { getBusinessHoursStatus } from "@/lib/utils"

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

      console.log("🔍 === DEBUG DADOS COMPLETOS ===")
      console.log("📝 lastMessage:", JSON.stringify(lastMessage, null, 2))
      console.log("👤 chatData.Contact:", JSON.stringify(chatData.Contact, null, 2))
      console.log("🎧 chatData.OrganizationMember:", JSON.stringify(chatData.OrganizationMember, null, 2))
      console.log("🔍 Payload.Content:", JSON.stringify(Payload.Content, null, 2))

      const conversation_id = chatData.Id
      const customer_name = chatData.Contact?.Name || "Cliente"
      const customer_phone = chatData.Contact?.Phone || null
      const customer_email = chatData.Contact?.Email || null

      // Lógica melhorada para identificar o tipo de remetente
      const sourceValue = (lastMessage.Source || "").toLowerCase().trim()
      console.log("📊 Source original:", lastMessage.Source)
      console.log("📊 Source processado:", sourceValue)

      let sender_type: "customer" | "agent"

      // Identificação baseada no Source
      if (sourceValue === "contact" || sourceValue === "customer") {
        sender_type = "customer"
      } else if (sourceValue === "agent" || sourceValue === "member" || sourceValue === "organizationmember") {
        sender_type = "agent"
      } else {
        // Fallback: se não tem Source, verificar se há dados de membro
        const hasMemberData = lastMessage.Member?.Name || lastMessage.Member?.DisplayName || lastMessage.Member?.FullName
        sender_type = hasMemberData ? "agent" : "customer"
        console.log("⚠️ Fallback usado - sender_type:", sender_type, "hasMemberData:", !!hasMemberData)
      }

      console.log("📊 sender_type determinado:", sender_type)

      // Captura simples e direta do nome do agente
      let agent_name = "Sistema"
      let sender_name: string

      if (sender_type === "agent") {
        // Para mensagens de agente, usar o nome de quem está enviando
        agent_name = 
          lastMessage.Member?.Name ||
          lastMessage.Member?.DisplayName ||
          lastMessage.Member?.FullName ||
          lastMessage.Member?.FirstName ||
          lastMessage.Member?.Username ||
          lastMessage.Member?.Email ||
          "Atendente"
        
        sender_name = agent_name
        
        console.log("🎧 === NOME DO AGENTE QUE ENVIOU ===")
        console.log("lastMessage.Member?.Name:", lastMessage.Member?.Name)
        console.log("lastMessage.Member?.DisplayName:", lastMessage.Member?.DisplayName)
        console.log("Nome capturado:", agent_name)
        console.log("=====================================")
      } else {
        // Para mensagens de cliente, manter o agente responsável pela conversa
        agent_name = 
          chatData.OrganizationMember?.Name ||
          chatData.OrganizationMember?.DisplayName ||
          chatData.OrganizationMember?.FullName ||
          chatData.OrganizationMember?.FirstName ||
          chatData.OrganizationMember?.Username ||
          chatData.OrganizationMember?.Email ||
          "Sistema"
        
        sender_name = customer_name
        
        console.log("👤 === AGENTE RESPONSÁVEL PELA CONVERSA ===")
        console.log("chatData.OrganizationMember?.Name:", chatData.OrganizationMember?.Name)
        console.log("chatData.OrganizationMember?.DisplayName:", chatData.OrganizationMember?.DisplayName)
        console.log("Agente responsável:", agent_name)
        console.log("=====================================")
      }

      const message_text = lastMessage.Content || "🎵 Mensagem de áudio"
      const isSiteCustomer = message_text.toLowerCase().includes("olá, vim do site do marcelino")

      console.log("🌐 === DETECÇÃO CLIENTE SITE ===")
      console.log("📝 Mensagem:", message_text.substring(0, 100))
      console.log("🔍 É cliente do site?", isSiteCustomer ? "✅ SIM" : "❌ NÃO")

      console.log("✅ === RESULTADO FINAL ===")
      console.log(`📊 sender_type: "${sender_type}"`)
      console.log(`👤 sender_name: "${sender_name}"`)
      console.log(`🎧 agent_name: "${agent_name}"`)
      console.log(`🌐 is_site_customer: ${isSiteCustomer}`)
      console.log("=====================================")

      // Criar ou atualizar conversa
      await DatabaseService.createOrUpdateConversation({
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

      console.log("💾 Mensagem salva no banco:", savedMessage ? "✅ Sucesso" : "❌ Falhou")

      // Cálculo de tempo de resposta
      if (sender_type === "agent" && !lastMessage.IsPrivate) {
        console.log("⏱️ === CALCULANDO TEMPO DE RESPOSTA ===")
        console.log(`📝 Mensagem do agente: ${sender_name}`)
        console.log(`📝 EventDate da resposta: ${EventDate}`)
        console.log(`📝 Conversa: ${conversation_id}`)

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

          // Só calcular se o tempo for positivo e razoável (menos de 30 dias)
          if (responseTimeSeconds > 0 && responseTimeSeconds < 30 * 24 * 60 * 60) {
            // Verificar horário de atendimento
            const businessHoursStatus = getBusinessHoursStatus(customerMessageTime, agentResponseTime)
            
            console.log(`🕐 Status horário: ${businessHoursStatus.status}`)
            
            await DatabaseService.saveResponseTime({
              conversation_id,
              customer_message_id: lastCustomerMessage.message_id || "",
              agent_message_id: message_id,
              response_time_seconds: responseTimeSeconds,
              customer_message_time: customerMessageTime,
              agent_response_time: agentResponseTime,
              customer_outside_hours: businessHoursStatus.customerOutsideHours,
              agent_outside_hours: businessHoursStatus.agentOutsideHours,
              business_hours_status: businessHoursStatus.status,
            })

            console.log(
              `✅ Tempo de resposta salvo: ${Math.floor(responseTimeSeconds / 60)}min ${responseTimeSeconds % 60}s - ${businessHoursStatus.status}`,
            )
          } else {
            console.log(`⚠️ Tempo de resposta inválido: ${responseTimeSeconds}s`)
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
      const new_agent = Payload.Content.OrganizationMember?.Name || "Sistema"
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
