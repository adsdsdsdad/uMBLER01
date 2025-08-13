import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  console.log("API de métricas chamada...")

  try {
    // Tentar importar e usar o DatabaseService
    const { DatabaseService } = await import("@/lib/database")
    
    // Executar teste de dados primeiro
    console.log("🧪 Executando teste de dados...")
    await DatabaseService.testConversationData()
    
    // Testar consulta simples primeiro
    console.log("🔍 Testando consulta simples...")
    const simpleConversations = await DatabaseService.getSimpleConversations()
    
    // Agora a consulta completa
    const conversations = await DatabaseService.getConversationsWithMetrics()
    
    console.log("📊 Total de conversas retornadas:", conversations.length)
    
    // Debug: verificar os primeiros registros
    if (conversations.length > 0) {
      console.log("🔍 Primeira conversa:", {
        conversation_id: conversations[0].conversation_id,
        customer_name: conversations[0].customer_name,
        agent_name: conversations[0].agent_name,
        status: conversations[0].status,
        total_messages: conversations[0].total_messages
      })
    }
    
    // Verificar se há conversas sem agente
    const conversationsWithoutAgent = conversations.filter(c => !c.agent_name || c.agent_name === "")
    console.log("⚠️ Conversas sem agente:", conversationsWithoutAgent.length)
    
    if (conversationsWithoutAgent.length > 0) {
      console.log("📝 Exemplo de conversa sem agente:", {
        conversation_id: conversationsWithoutAgent[0].conversation_id,
        customer_name: conversationsWithoutAgent[0].customer_name,
        agent_name: conversationsWithoutAgent[0].agent_name
      })
    }

    return Response.json({
      success: true,
      data: conversations.slice(0, 10),
      count: conversations.length,
      timestamp: new Date().toISOString(),
      debug: {
        total_conversations: conversations.length,
        conversations_without_agent: conversationsWithoutAgent.length,
        sample_conversation: conversations[0] || null,
        simple_vs_complex: {
          simple_count: simpleConversations.length,
          complex_count: conversations.length,
          simple_sample: simpleConversations[0] || null,
          complex_sample: conversations[0] || null
        }
      }
    })
  } catch (error) {
    console.error("Erro ao buscar métricas:", error)

    // Retornar dados mock em caso de erro
    const mockData = [
      {
        conversation_id: "demo_001",
        customer_name: "Cliente Demo",
        agent_name: "Agente Demo",
        total_messages: 5,
        avg_response_time: 120,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      {
        conversation_id: "demo_002",
        customer_name: "Cliente Teste",
        agent_name: "Agente Teste",
        total_messages: 8,
        avg_response_time: 95,
        status: "closed",
        updated_at: new Date().toISOString(),
      },
    ]

    return Response.json({
      success: true,
      data: mockData,
      count: mockData.length,
      timestamp: new Date().toISOString(),
      note: "Dados de demonstração - banco não disponível",
    })
  }
}
