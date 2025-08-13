import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface Conversation {
  id: number
  conversation_id: string
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  agent_name?: string
  status: string
  is_site_customer?: boolean // Adicionar flag para cliente do site
  created_at: Date
  updated_at: Date
}

export interface Message {
  id: number
  conversation_id: string
  message_id?: string
  sender_type: "customer" | "agent"
  sender_name?: string
  message_text?: string
  message_type: string
  timestamp: Date
  created_at: Date
}

export interface ResponseTime {
  id: number
  conversation_id: string
  customer_message_id: string
  agent_message_id?: string
  customer_message_time: Date
  agent_response_time?: Date
  response_time_seconds?: number
  created_at: Date
}

export class DatabaseService {
  static async createOrUpdateConversation(data: {
    conversation_id: string
    customer_name?: string
    customer_phone?: string
    customer_email?: string
    agent_name?: string
    is_site_customer?: boolean // Adicionar parâmetro
  }) {
    const result = await sql`
      INSERT INTO conversations (conversation_id, customer_name, customer_phone, customer_email, agent_name, is_site_customer, updated_at)
      VALUES (${data.conversation_id}, ${data.customer_name}, ${data.customer_phone}, ${data.customer_email}, ${data.agent_name}, ${data.is_site_customer || false}, NOW())
      ON CONFLICT (conversation_id) 
      DO UPDATE SET 
        customer_name = COALESCE(EXCLUDED.customer_name, conversations.customer_name),
        customer_phone = COALESCE(EXCLUDED.customer_phone, conversations.customer_phone),
        customer_email = COALESCE(EXCLUDED.customer_email, conversations.customer_email),
        agent_name = COALESCE(EXCLUDED.agent_name, conversations.agent_name),
        is_site_customer = COALESCE(EXCLUDED.is_site_customer, conversations.is_site_customer),
        updated_at = NOW()
      RETURNING *
    `
    return result[0] as Conversation
  }

  static async createMessage(data: {
    conversation_id: string
    message_id?: string
    sender_type: "customer" | "agent"
    sender_name?: string
    message_text?: string
    message_type?: string
    timestamp: Date
  }) {
    const result = await sql`
      INSERT INTO messages (conversation_id, message_id, sender_type, sender_name, message_text, message_type, timestamp)
      VALUES (${data.conversation_id}, ${data.message_id}, ${data.sender_type}, ${data.sender_name}, ${data.message_text}, ${data.message_type || "text"}, ${data.timestamp})
      ON CONFLICT (message_id) DO NOTHING
      RETURNING *
    `
    return result[0] as Message
  }

  static async getLastCustomerMessage(conversationId: string) {
    const result = await sql`
      SELECT * FROM messages 
      WHERE conversation_id = ${conversationId} 
      AND sender_type = 'customer'
      ORDER BY timestamp DESC 
      LIMIT 1
    `
    return result[0] as Message | undefined
  }

  static async saveResponseTime(data: {
    conversation_id: string
    customer_message_id: string
    agent_message_id: string
    response_time_seconds: number
    customer_message_time: Date
    agent_response_time: Date
  }) {
    const result = await sql`
      INSERT INTO response_times (
        conversation_id, 
        customer_message_id, 
        agent_message_id, 
        customer_message_time, 
        agent_response_time, 
        response_time_seconds
      )
      VALUES (
        ${data.conversation_id}, 
        ${data.customer_message_id}, 
        ${data.agent_message_id}, 
        ${data.customer_message_time}, 
        ${data.agent_response_time}, 
        ${data.response_time_seconds}
      )
      ON CONFLICT (customer_message_id, agent_message_id) DO NOTHING
      RETURNING *
    `
    return result[0] as ResponseTime
  }

  static async calculateResponseTime(conversationId: string, customerMessageId: string, agentMessageId: string) {
    // Buscar mensagem do cliente
    const customerMessage = await sql`
      SELECT * FROM messages 
      WHERE conversation_id = ${conversationId} AND message_id = ${customerMessageId} AND sender_type = 'customer'
      ORDER BY timestamp DESC LIMIT 1
    `

    // Buscar mensagem do agente
    const agentMessage = await sql`
      SELECT * FROM messages 
      WHERE conversation_id = ${conversationId} AND message_id = ${agentMessageId} AND sender_type = 'agent'
      ORDER BY timestamp DESC LIMIT 1
    `

    if (customerMessage[0] && agentMessage[0]) {
      const customerTime = new Date(customerMessage[0].timestamp)
      const agentTime = new Date(agentMessage[0].timestamp)
      const responseTimeSeconds = Math.floor((agentTime.getTime() - customerTime.getTime()) / 1000)

      // Salvar tempo de resposta
      const result = await sql`
        INSERT INTO response_times (conversation_id, customer_message_id, agent_message_id, customer_message_time, agent_response_time, response_time_seconds)
        VALUES (${conversationId}, ${customerMessageId}, ${agentMessageId}, ${customerTime}, ${agentTime}, ${responseTimeSeconds})
        ON CONFLICT (customer_message_id, agent_message_id) DO NOTHING
        RETURNING *
      `
      return result[0] as ResponseTime
    }
    return null
  }

  static async calculateResponseTimeForLatestMessage(conversationId: string) {
    console.log(`🔍 Calculando tempo de resposta para conversa: ${conversationId}`)

    // Buscar a última mensagem do agente
    const latestAgentMessage = await sql`
      SELECT * FROM messages 
      WHERE conversation_id = ${conversationId} AND sender_type = 'agent'
      ORDER BY timestamp DESC LIMIT 1
    `

    if (!latestAgentMessage[0]) {
      console.log("❌ Nenhuma mensagem de agente encontrada")
      return null
    }

    console.log(
      `📨 Última mensagem do agente: ${latestAgentMessage[0].message_id} às ${latestAgentMessage[0].timestamp}`,
    )

    // Buscar TODAS as mensagens do cliente que ainda não têm resposta calculada
    // e que são anteriores à resposta do agente
    const pendingCustomerMessages = await sql`
      SELECT * FROM messages 
      WHERE conversation_id = ${conversationId} 
      AND sender_type = 'customer' 
      AND timestamp < ${latestAgentMessage[0].timestamp}
      AND message_id NOT IN (
        SELECT customer_message_id FROM response_times 
        WHERE conversation_id = ${conversationId}
        AND customer_message_id IS NOT NULL
      )
      ORDER BY timestamp ASC
    `

    console.log(`🔍 Encontradas ${pendingCustomerMessages.length} mensagens de cliente pendentes`)

    if (pendingCustomerMessages.length === 0) {
      console.log("✅ Nenhuma mensagem de cliente pendente para calcular")
      return null
    }

    const responseTimesCalculated = []

    // Calcular tempo de resposta para cada mensagem de cliente pendente
    for (const customerMessage of pendingCustomerMessages) {
      const customerTime = new Date(customerMessage.timestamp)
      const agentTime = new Date(latestAgentMessage[0].timestamp)
      const responseTimeSeconds = Math.floor((agentTime.getTime() - customerTime.getTime()) / 1000)

      console.log(`⏱️ Calculando tempo para mensagem ${customerMessage.message_id}: ${responseTimeSeconds}s`)

      try {
        // Salvar tempo de resposta
        const result = await sql`
          INSERT INTO response_times (conversation_id, customer_message_id, agent_message_id, customer_message_time, agent_response_time, response_time_seconds)
          VALUES (${conversationId}, ${customerMessage.message_id}, ${latestAgentMessage[0].message_id}, ${customerTime}, ${agentTime}, ${responseTimeSeconds})
          ON CONFLICT (customer_message_id, agent_message_id) DO NOTHING
          RETURNING *
        `

        if (result[0]) {
          responseTimesCalculated.push(result[0])
          console.log(`✅ Tempo de resposta salvo: ${responseTimeSeconds}s`)
        }
      } catch (error) {
        console.error(`❌ Erro ao salvar tempo de resposta:`, error)
      }
    }

    console.log(`✅ Total calculados: ${responseTimesCalculated.length} tempos de resposta`)
    return responseTimesCalculated.length > 0 ? responseTimesCalculated[0] : null
  }

  static async recalculateAllResponseTimes() {
    console.log("🔄 Recalculando todos os tempos de resposta...")

    // Buscar todas as conversas
    const conversations = await sql`SELECT DISTINCT conversation_id FROM conversations`

    let totalCalculated = 0

    for (const conv of conversations) {
      const result = await this.calculateResponseTimeForLatestMessage(conv.conversation_id)
      if (result) totalCalculated++
    }

    console.log(`✅ Recalculados tempos para ${totalCalculated} conversas`)
    return totalCalculated
  }

  static async getConversationsWithMetrics() {
    console.log("🔍 Executando getConversationsWithMetrics...")
    
    try {
      // Primeiro, vamos verificar as conversas simples
      const simpleConversations = await sql`
        SELECT conversation_id, customer_name, agent_name, status, updated_at
        FROM conversations 
        ORDER BY updated_at DESC 
        LIMIT 5
      `
      
      console.log("📊 Conversas simples encontradas:", simpleConversations.length)
      if (simpleConversations.length > 0) {
        console.log("🔍 Primeira conversa simples:", {
          conversation_id: simpleConversations[0].conversation_id,
          customer_name: simpleConversations[0].customer_name,
          agent_name: simpleConversations[0].agent_name,
          status: simpleConversations[0].status
        })
      }
      
      // Agora a consulta completa
      const result = await sql`
        SELECT 
          c.conversation_id,
          c.customer_name,
          c.customer_phone,
          c.customer_email,
          c.agent_name,
          c.status,
          c.is_site_customer,
          c.created_at,
          c.updated_at,
          COALESCE(COUNT(m.id), 0) as total_messages,
          COALESCE(COUNT(CASE WHEN m.sender_type = 'customer' THEN 1 END), 0) as customer_messages,
          COALESCE(COUNT(CASE WHEN m.sender_type = 'agent' THEN 1 END), 0) as agent_messages,
          COALESCE(AVG(rt.response_time_seconds), 0) as avg_response_time,
          COALESCE(MIN(rt.response_time_seconds), 0) as min_response_time,
          COALESCE(MAX(rt.response_time_seconds), 0) as max_response_time
        FROM conversations c
        LEFT JOIN messages m ON c.conversation_id = m.conversation_id
        LEFT JOIN response_times rt ON c.conversation_id = rt.conversation_id
        GROUP BY c.conversation_id, c.customer_name, c.customer_phone, c.customer_email, c.agent_name, c.status, c.is_site_customer, c.created_at, c.updated_at
        ORDER BY c.updated_at DESC
      `
      
      console.log("✅ Consulta completa executada com sucesso")
      console.log("📊 Total de resultados:", result.length)
      
      if (result.length > 0) {
        console.log("🔍 Primeiro resultado completo:", {
          conversation_id: result[0].conversation_id,
          customer_name: result[0].customer_name,
          agent_name: result[0].agent_name,
          status: result[0].status,
          total_messages: result[0].total_messages
        })
      }
      
      return result
    } catch (error) {
      console.error("❌ Erro na consulta getConversationsWithMetrics:", error)
      throw error
    }
  }

  static async getConversationMessages(conversationId: string) {
    const result = await sql`
      SELECT * FROM messages 
      WHERE conversation_id = ${conversationId}
      ORDER BY timestamp ASC
    `
    return result as Message[]
  }

  static async getConversationResponseTimes(conversationId: string) {
    const result = await sql`
      SELECT * FROM response_times 
      WHERE conversation_id = ${conversationId}
      ORDER BY customer_message_time ASC
    `
    return result as ResponseTime[]
  }

  static async updateConversationStatus(conversationId: string, status: string) {
    const result = await sql`
      UPDATE conversations 
      SET status = ${status}, updated_at = NOW()
      WHERE conversation_id = ${conversationId}
      RETURNING *
    `
    return result[0] as Conversation
  }

  static async updateConversationAgent(conversationId: string, agentName: string) {
    const result = await sql`
      UPDATE conversations 
      SET agent_name = ${agentName}, updated_at = NOW()
      WHERE conversation_id = ${conversationId}
      RETURNING *
    `
    return result[0] as Conversation
  }

  static async getMessagesWithResponseTimes(conversationId: string) {
    const result = await sql`
      SELECT 
        m.*,
        rt.response_time_seconds,
        rt.agent_response_time
      FROM messages m
      LEFT JOIN response_times rt ON m.message_id = rt.customer_message_id
      WHERE m.conversation_id = ${conversationId}
      ORDER BY m.timestamp ASC
    `
    return result
  }

  static async getSiteCustomersWithMetrics() {
    const result = await sql`
      SELECT 
        c.*,
        COUNT(m.id) as total_messages,
        COUNT(CASE WHEN m.sender_type = 'customer' THEN 1 END) as customer_messages,
        COUNT(CASE WHEN m.sender_type = 'agent' THEN 1 END) as agent_messages,
        AVG(rt.response_time_seconds) as avg_response_time,
        MIN(rt.response_time_seconds) as min_response_time,
        MAX(rt.response_time_seconds) as max_response_time
      FROM conversations c
      LEFT JOIN messages m ON c.conversation_id = m.conversation_id
      LEFT JOIN response_times rt ON c.conversation_id = rt.conversation_id
      WHERE c.is_site_customer = true
      GROUP BY c.id, c.conversation_id, c.customer_name, c.customer_phone, c.customer_email, c.agent_name, c.status, c.is_site_customer, c.created_at, c.updated_at
      ORDER BY c.updated_at DESC
    `
    return result
  }

  static async testConversationData() {
    console.log("🧪 === TESTE DE DADOS DE CONVERSA ===")
    
    try {
      // Teste 1: Verificar conversas simples
      const simpleConversations = await sql`
        SELECT conversation_id, customer_name, agent_name, status, updated_at
        FROM conversations 
        ORDER BY updated_at DESC 
        LIMIT 3
      `
      
      console.log("📊 Teste 1 - Conversas simples:", simpleConversations.length)
      simpleConversations.forEach((conv, index) => {
        console.log(`  ${index + 1}. ${conv.conversation_id}: ${conv.customer_name} | Agente: ${conv.agent_name || 'N/A'} | Status: ${conv.status}`)
      })
      
      // Teste 2: Verificar se há conversas sem agente
      const conversationsWithoutAgent = await sql`
        SELECT conversation_id, customer_name, agent_name, status
        FROM conversations 
        WHERE agent_name IS NULL OR agent_name = '' OR agent_name = 'Sistema'
        ORDER BY updated_at DESC 
        LIMIT 5
      `
      
      console.log("⚠️ Teste 2 - Conversas sem agente válido:", conversationsWithoutAgent.length)
      conversationsWithoutAgent.forEach((conv, index) => {
        console.log(`  ${index + 1}. ${conv.conversation_id}: ${conv.customer_name} | Agente: "${conv.agent_name}" | Status: ${conv.status}`)
      })
      
      // Teste 3: Verificar mensagens recentes
      const recentMessages = await sql`
        SELECT conversation_id, sender_type, sender_name, message_text, timestamp
        FROM messages 
        ORDER BY timestamp DESC 
        LIMIT 5
      `
      
      console.log("📝 Teste 3 - Mensagens recentes:", recentMessages.length)
      recentMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. ${msg.conversation_id}: ${msg.sender_type} (${msg.sender_name}) | ${msg.message_text?.substring(0, 50)}...`)
      })
      
      console.log("✅ === TESTE CONCLUÍDO ===")
      
      return {
        simpleConversations,
        conversationsWithoutAgent,
        recentMessages
      }
    } catch (error) {
      console.error("❌ Erro no teste:", error)
      throw error
    }
  }

  static async getSimpleConversations() {
    console.log("🔍 Executando getSimpleConversations...")
    
    try {
      const result = await sql`
        SELECT 
          conversation_id,
          customer_name,
          agent_name,
          status,
          updated_at
        FROM conversations 
        ORDER BY updated_at DESC 
        LIMIT 10
      `
      
      console.log("✅ getSimpleConversations executado com sucesso")
      console.log("📊 Total de resultados:", result.length)
      
      if (result.length > 0) {
        console.log("🔍 Primeiro resultado:", {
          conversation_id: result[0].conversation_id,
          customer_name: result[0].customer_name,
          agent_name: result[0].agent_name,
          status: result[0].status
        })
      }
      
      return result
    } catch (error) {
      console.error("❌ Erro em getSimpleConversations:", error)
      throw error
    }
  }

  static async getRawConversations() {
    console.log("🔍 Executando getRawConversations (consulta bruta)...")
    
    try {
      const result = await sql`
        SELECT * FROM conversations ORDER BY updated_at DESC LIMIT 5
      `
      
      console.log("✅ getRawConversations executado com sucesso")
      console.log("📊 Total de resultados:", result.length)
      
      if (result.length > 0) {
        console.log("🔍 Primeiro resultado bruto:", result[0])
      }
      
      return result
    } catch (error) {
      console.error("❌ Erro em getRawConversations:", error)
      throw error
    }
  }
}
