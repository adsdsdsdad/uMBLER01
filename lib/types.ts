// Tipos centralizados do sistema

export interface Conversation {
  id: number
  conversation_id: string
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  agent_name?: string
  status: string
  is_site_customer?: boolean
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

export interface ConversationMetrics extends Conversation {
  total_messages: number
  customer_messages: number
  agent_messages: number
  avg_response_time: number
  min_response_time: number
  max_response_time: number
}

export interface AgentMetrics {
  agent_name: string
  total_conversations: number
  total_messages: number
  avg_response_time: number
  min_response_time: number
  max_response_time: number
  response_count: number
}

export interface RealtimeMetrics {
  conversation_id: string
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  agent_name?: string
  status: string
  is_site_customer?: boolean
  total_messages: number
  customer_messages: number
  agent_messages: number
  avg_response_time: number
  min_response_time: number
  max_response_time: number
  created_at: string
  updated_at: string
}

export interface UmblerWebhookPayload {
  Type: string
  EventDate: string
  Payload: {
    Type: string
    Content: any
  }
  EventId: string
}

export interface UmblerChatData {
  Id: string
  Contact?: {
    Name?: string
    Phone?: string
    Email?: string
  }
  OrganizationMember?: {
    Name?: string
    DisplayName?: string
  }
  LastMessage: {
    Id?: string
    Source?: string
    Content?: string
    IsPrivate?: boolean
    Member?: {
      Name?: string
      DisplayName?: string
    }
  }
}

export interface WebhookResponse {
  success: boolean
  message: string
  event_type: string
  conversation_id: string
  sender_type: string
  sender_name: string
  agent_name: string
  is_site_customer: boolean
  event_id: string
  processed_at: string
}
