// Configurações centralizadas do sistema
export const config = {
  // Configurações do banco de dados
  database: {
    url: process.env.DATABASE_URL,
    maxConnections: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  
  // Configurações da aplicação
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || "Sistema de Atendimento",
    version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    environment: process.env.NODE_ENV || "development",
  },
  
  // Configurações de tempo real
  realtime: {
    updateInterval: 10000, // 10 segundos
    maxRetries: 3,
    retryDelay: 5000, // 5 segundos
  },
  
  // Configurações de métricas
  metrics: {
    maxConversations: 100,
    responseTimeThreshold: {
      fast: 30, // segundos
      normal: 120, // segundos
      slow: 300, // segundos
    },
  },
  
  // Configurações de segurança
  security: {
    webhookSecret: process.env.UMBLER_WEBHOOK_SECRET,
    maxRequestSize: "10mb",
  },
  
  // Configurações de log
  logging: {
    level: process.env.LOG_LEVEL || "info",
    enableConsole: true,
    enableFile: false,
  },
} as const

// Validação das configurações obrigatórias
export function validateConfig() {
  const requiredEnvVars = ['DATABASE_URL']
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Variável de ambiente obrigatória não definida: ${envVar}`)
    }
  }
  
  return true
}