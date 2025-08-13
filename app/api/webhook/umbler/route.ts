// ARQUIVO: app/api/webhook/umbler/route.ts
// SUBSTITUA as seções marcadas abaixo:

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

      // ===== SUBSTITUA ESTA SEÇÃO INTEIRA =====
      // COMEÇE A SUBSTITUIÇÃO AQUI ⬇️
      console.log("🔍 === DEBUG DADOS COMPLETOS ===")
      console.log("📝 lastMessage:", JSON.stringify(lastMessage, null, 2))
      console.log("👤 chatData.Contact:", JSON.stringify(chatData.Contact, null, 2))
      console.log("🎧 chatData.OrganizationMember:", JSON.stringify(chatData.OrganizationMember, null, 2))
      console.log("🔍 Payload.Content:", JSON.stringify(Payload.Content, null, 2))

      const conversation_id = chatData.Id
      const customer_name = chatData.Contact?.Name || "Cliente"
      const customer_phone = chatData.Contact?.Phone || null
      const customer_email = chatData.Contact?.Email || null

      // CORREÇÃO 1: Lógica mais robusta para sender_type
      const sourceValue = (lastMessage.Source || "").toLowerCase().trim()
      console.log("📊 Source original:", lastMessage.Source)
      console.log("📊 Source processado:", sourceValue)

      let sender_type: "customer" | "agent"

      // Lógica melhorada para identificar o tipo de remetente
      if (sourceValue === "contact" || sourceValue === "customer") {
        sender_type = "customer"
      } else if (sourceValue === "agent" || sourceValue === "member" || sourceValue === "organizationmember") {
        sender_type = "agent"
      } else {
        // Fallback: verificar se há dados de membro/organização
        const hasMemberData = lastMessage.Member?.Name || chatData.OrganizationMember?.Name
        sender_type = hasMemberData ? "agent" : "customer"
        console.log("⚠️ Fallback usado - sender_type:", sender_type, "hasMemberData:", !!hasMemberData)
      }

      console.log("📊 sender_type determinado:", sender_type)

      // CORREÇÃO 2: Melhor captura do nome do agente
      let agent_name = "Sistema"
      let sender_name: string

      if (sender_type === "agent") {
        // Tentar TODAS as fontes possíveis
        const sources = {
          // Fontes do lastMessage.Member
          memberName: lastMessage.Member?.Name,
          memberDisplayName: lastMessage.Member?.DisplayName,
          memberFullName: lastMessage.Member?.FullName,
          memberFirstName: lastMessage.Member?.FirstName,
          memberLastName: lastMessage.Member?.LastName,
          memberUsername: lastMessage.Member?.Username,
          memberEmail: lastMessage.Member?.Email,

          // Fontes do chatData.OrganizationMember
          orgMemberName: chatData.OrganizationMember?.Name,
          orgMemberDisplayName: chatData.OrganizationMember?.DisplayName,
          orgMemberFullName: chatData.OrganizationMember?.FullName,
          orgMemberFirstName: chatData.OrganizationMember?.FirstName,
          orgMemberLastName: chatData.OrganizationMember?.LastName,
          orgMemberUsername: chatData.OrganizationMember?.Username,
          orgMemberEmail: chatData.OrganizationMember?.Email,

          // Fontes do Payload.Content
          payloadMemberName: Payload.Content?.OrganizationMember?.Name,
          payloadMemberDisplayName: Payload.Content?.OrganizationMember?.DisplayName,

          // Fontes alternativas
          lastMessageAuthor: lastMessage.Author,
          lastMessageSender: lastMessage.Sender,
          lastMessageFrom: lastMessage.From,
          lastMessageUser: lastMessage.User,

          // Fontes do chatData direto
          chatDataAgent: chatData.Agent?.Name,
          chatDataAssignedTo: chatData.AssignedTo?.Name,
          chatDataOwner: chatData.Owner?.Name,
        }

        console.log("🎧 === TODAS AS FONTES DE NOME DO AGENTE ===")
        Object.entries(sources).forEach(([key, value]) => {
          if (value) console.log(`✅ ${key}:`, value)
          else console.log(`❌ ${key}: null/undefined`)
        })

        agent_name =
          sources.memberName ||
          sources.memberDisplayName ||
          sources.memberFullName ||
          sources.orgMemberName ||
          sources.orgMemberDisplayName ||
          sources.orgMemberFullName ||
          sources.payloadMemberName ||
          sources.payloadMemberDisplayName ||
          sources.lastMessageAuthor ||
          sources.lastMessageSender ||
          sources.lastMessageFrom ||
          sources.lastMessageUser ||
          sources.chatDataAgent ||
          sources.chatDataAssignedTo ||
          sources.chatDataOwner ||
          sources.memberFirstName ||
          sources.memberUsername ||
          sources.orgMemberFirstName ||
          sources.orgMemberUsername ||
          "Atendente"

        sender_name = agent_name
        console.log("✅ Nome do agente selecionado:", agent_name)

        if (agent_name === "Atendente" || agent_name === "Sistema") {
          console.log("⚠️ Nome genérico detectado, tentando fontes alternativas...")

          // Tentar extrair de qualquer campo que contenha nome
          const allData = JSON.stringify(body)
          const nameMatches = allData.match(/"Name":\s*"([^"]+)"/g)
          const displayNameMatches = allData.match(/"DisplayName":\s*"([^"]+)"/g)

          console.log("🔍 Nomes encontrados no JSON:", nameMatches)
          console.log("🔍 DisplayNames encontrados no JSON:", displayNameMatches)

          if (nameMatches && nameMatches.length > 0) {
            const extractedName = nameMatches[0].match(/"([^"]+)"$/)?.[1]
            if (extractedName && extractedName !== customer_name) {
              agent_name = extractedName
              sender_name = agent_name
              console.log("🎯 Nome extraído do JSON:", agent_name)
            }
          }
        }
      } else {
        sender_name = customer_name
        // Para conversas de cliente, manter o agente responsável
        agent_name = chatData.OrganizationMember?.Name || chatData.OrganizationMember?.DisplayName || "Sistema"
        console.log("👤 Mensagem de cliente, agente responsável:", agent_name)
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
      // TERMINE A SUBSTITUIÇÃO AQUI ⬆️

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

      // O resto do código permanece igual (cálculo de tempo de resposta)...
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

          if (responseTimeSeconds > 0) {
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
        agent_name, // Adicionar agent_name na resposta
        is_site_customer: isSiteCustomer,
        event_id: EventId,
        processed_at: new Date().toISOString(),
      })
    }

    // Resto do código permanece igual para outros tipos de evento...
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
