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
  customer_outside_hours?: boolean
  agent_outside_hours?: boolean
  business_hours_status?: string
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
    customer_outside_hours?: boolean
    agent_outside_hours?: boolean
    business_hours_status?: string
  }) {
    const result = await sql`
      INSERT INTO response_times (
        conversation_id, 
        customer_message_id, 
        agent_message_id, 
        customer_message_time, 
        agent_response_time, 
        response_time_seconds,
        customer_outside_hours,
        agent_outside_hours,
        business_hours_status
      )
      VALUES (
        ${data.conversation_id}, 
        ${data.customer_message_id}, 
        ${data.agent_message_id}, 
        ${data.customer_message_time}, 
        ${data.agent_response_time}, 
        ${data.response_time_seconds},
        ${data.customer_outside_hours || false},
        ${data.agent_outside_hours || false},
        ${data.business_hours_status || 'Dentro do horário'}
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

      // Verificar horário de atendimento
      const { isOutsideBusinessHours, getBusinessHoursStatus } = await import('@/lib/utils')
      const businessHoursStatus = getBusinessHoursStatus(customerTime, agentTime)

      console.log(`🕐 Status horário: ${businessHoursStatus.status}`)

      try {
        // Salvar tempo de resposta com informações de horário
        const result = await sql`
          INSERT INTO response_times (
            conversation_id, 
            customer_message_id, 
            agent_message_id, 
            customer_message_time, 
            agent_response_time, 
            response_time_seconds,
            customer_outside_hours,
            agent_outside_hours,
            business_hours_status
          )
          VALUES (
            ${conversationId}, 
            ${customerMessage.message_id}, 
            ${latestAgentMessage[0].message_id}, 
            ${customerTime}, 
            ${agentTime}, 
            ${responseTimeSeconds},
            ${businessHoursStatus.customerOutsideHours},
            ${businessHoursStatus.agentOutsideHours},
            ${businessHoursStatus.status}
          )
          ON CONFLICT (customer_message_id, agent_message_id) DO NOTHING
          RETURNING *
        `

        if (result[0]) {
          responseTimesCalculated.push(result[0])
          console.log(`✅ Tempo de resposta salvo: ${responseTimeSeconds}s - ${businessHoursStatus.status}`)
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

  static async recalculateAllMetrics() {
    console.log("🔄 Recalculando todas as métricas...")

    // Buscar todas as conversas
    const conversations = await sql`SELECT DISTINCT conversation_id FROM conversations`

    let totalProcessed = 0

    for (const conv of conversations) {
      try {
        const metrics = await this.getConversationMetrics(conv.conversation_id)
        console.log(`✅ Métricas recalculadas para conversa ${conv.conversation_id}:`, {
          total_messages: metrics.total_messages,
          customer_messages: metrics.customer_messages,
          agent_messages: metrics.agent_messages,
          response_times_count: metrics.response_times_count
        })
        totalProcessed++
      } catch (error) {
        console.error(`❌ Erro ao recalcular métricas para conversa ${conv.conversation_id}:`, error)
      }
    }

    console.log(`✅ Métricas recalculadas para ${totalProcessed} conversas`)
    return totalProcessed
  }

  static async getConversationsWithMetrics() {
    const result = await sql`
      SELECT 
        c.*,
        COUNT(m.id) as total_messages,
        COUNT(CASE WHEN m.sender_type = 'customer' THEN 1 END) as customer_messages,
        COUNT(CASE WHEN m.sender_type = 'agent' THEN 1 END) as agent_messages,
        AVG(rt.response_time_seconds) as avg_response_time,
        MIN(rt.response_time_seconds) as min_response_time,
        MAX(rt.response_time_seconds) as max_response_time,
        COUNT(CASE WHEN rt.agent_outside_hours = true THEN 1 END) as responses_outside_hours,
        COUNT(CASE WHEN rt.business_hours_status != 'Dentro do horário' THEN 1 END) as total_outside_hours
      FROM conversations c
      LEFT JOIN messages m ON c.conversation_id = m.conversation_id
      LEFT JOIN response_times rt ON c.conversation_id = rt.conversation_id
      GROUP BY c.id, c.conversation_id, c.customer_name, c.customer_phone, c.customer_email, c.agent_name, c.status, c.is_site_customer, c.created_at, c.updated_at
      ORDER BY c.updated_at DESC
    `
    return result
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
        rt.agent_response_time,
        rt.customer_outside_hours,
        rt.agent_outside_hours,
        rt.business_hours_status
      FROM messages m
      LEFT JOIN response_times rt ON m.message_id = rt.customer_message_id
      WHERE m.conversation_id = ${conversationId}
      ORDER BY m.timestamp ASC
    `
    return result
  }

  static async getConversationMetrics(conversationId: string) {
    const result = await sql`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN sender_type = 'customer' THEN 1 END) as customer_messages,
        COUNT(CASE WHEN sender_type = 'agent' THEN 1 END) as agent_messages,
        AVG(rt.response_time_seconds) as avg_response_time,
        COUNT(rt.id) as response_times_count,
        COUNT(CASE WHEN rt.agent_outside_hours = true THEN 1 END) as responses_outside_hours,
        MIN(rt.response_time_seconds) as min_response_time,
        MAX(rt.response_time_seconds) as max_response_time
      FROM messages m
      LEFT JOIN response_times rt ON m.conversation_id = rt.conversation_id
      WHERE m.conversation_id = ${conversationId}
    `
    return result[0]
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

  static async getRecentMessages(limit = 5) {
    const result = await sql`
      SELECT 
        m.*,
        c.customer_name,
        c.agent_name,
        c.is_site_customer
      FROM messages m
      LEFT JOIN conversations c ON m.conversation_id = c.conversation_id
      ORDER BY m.timestamp DESC
      LIMIT ${limit}
    `
    return result
  }

  static async getSiteCustomersStats() {
    const result = await sql`
      SELECT 
        COUNT(*) as total_site_customers,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_conversations,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_conversations,
        AVG(rt.response_time_seconds) as avg_response_time,
        COUNT(DISTINCT DATE(c.created_at)) as days_with_site_customers
      FROM conversations c
      LEFT JOIN response_times rt ON c.conversation_id = rt.conversation_id
      WHERE c.is_site_customer = true
    `
    return result[0]
  }
}
