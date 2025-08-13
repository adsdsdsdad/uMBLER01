// Script simples para testar o webhook da Umbler
const webhookUrl = "https://seu-dominio.vercel.app/api/webhook/umbler"

// Teste básico - Mensagem do cliente
const testCustomerMessage = {
  Type: "Message",
  EventDate: "2024-02-07T18:44:01.3135533Z",
  Payload: {
    Type: "Chat",
    Content: {
      Id: "test_chat_001",
      Contact: {
        Name: "João Silva",
        Phone: "+5511999999999",
        Email: "joao@email.com",
      },
      OrganizationMember: {
        Name: "Maria Atendente",
        DisplayName: "Maria",
      },
      LastMessage: {
        Id: "msg_001",
        Content: "Olá, preciso de ajuda",
        Source: "contact",
        IsPrivate: false,
      },
    },
  },
  EventId: "test_event_001",
}

// Teste básico - Resposta do agente
const testAgentMessage = {
  Type: "Message",
  EventDate: "2024-02-07T18:46:15.1234567Z",
  Payload: {
    Type: "Chat",
    Content: {
      Id: "test_chat_001",
      Contact: {
        Name: "João Silva",
        Phone: "+5511999999999",
        Email: "joao@email.com",
      },
      OrganizationMember: {
        Name: "Maria Atendente",
        DisplayName: "Maria",
      },
      LastMessage: {
        Id: "msg_002",
        Content: "Olá João! Como posso ajudar?",
        Source: "member",
        IsPrivate: false,
        Member: {
          Name: "Maria Atendente",
          DisplayName: "Maria",
          Username: "maria.atendente",
        },
      },
    },
  },
  EventId: "test_event_002",
}

async function testWebhook(payload, description) {
  console.log(`\n🧪 Testando: ${description}`)
  console.log("Payload:", JSON.stringify(payload, null, 2))

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()
    console.log(`✅ Status: ${response.status}`)
    console.log("Resposta:", JSON.stringify(result, null, 2))
    
    if (result.success) {
      console.log("✅ Webhook funcionando corretamente!")
      console.log(`📊 sender_type: ${result.sender_type}`)
      console.log(`👤 sender_name: ${result.sender_name}`)
      console.log(`🎧 agent_name: ${result.agent_name}`)
    } else {
      console.log("❌ Webhook retornou erro:", result.error)
    }
  } catch (error) {
    console.error(`❌ Erro na requisição:`, error.message)
  }
}

async function runTests() {
  console.log("🚀 Iniciando testes simples do webhook...")
  console.log("⚠️ IMPORTANTE: Altere a URL do webhook no arquivo antes de executar!")

  // Teste 1: Mensagem do cliente
  await testWebhook(testCustomerMessage, "Mensagem do cliente")

  // Aguardar um pouco
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Teste 2: Resposta do agente
  await testWebhook(testAgentMessage, "Resposta do agente")

  console.log("\n✨ Testes concluídos!")
}

// Executar testes
runTests().catch(console.error)