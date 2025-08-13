import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { DatabaseService } = await import("@/lib/database")
    
    // Executar teste de dados
    const testResults = await DatabaseService.testConversationData()
    
    // Testar consultas diferentes
    const rawConversations = await DatabaseService.getRawConversations()
    const simpleConversations = await DatabaseService.getSimpleConversations()
    
    // Buscar conversas com métricas
    const conversations = await DatabaseService.getConversationsWithMetrics()
    
    // Verificar especificamente o agent_name
    const agentNameAnalysis = conversations.map(conv => ({
      conversation_id: conv.conversation_id,
      customer_name: conv.customer_name,
      agent_name: conv.agent_name,
      agent_name_type: typeof conv.agent_name,
      agent_name_length: conv.agent_name ? conv.agent_name.length : 0,
      is_null: conv.agent_name === null,
      is_undefined: conv.agent_name === undefined,
      is_empty: conv.agent_name === "",
      status: conv.status
    }))
    
    return Response.json({
      success: true,
      debug: {
        test_results: testResults,
        total_conversations: conversations.length,
        agent_name_analysis: agentNameAnalysis.slice(0, 5),
        sample_conversation: conversations[0] || null,
        query_comparison: {
          raw: rawConversations.slice(0, 2),
          simple: simpleConversations.slice(0, 2),
          complex: conversations.slice(0, 2)
        },
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error("Erro no debug:", error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    }, { status: 500 })
  }
}