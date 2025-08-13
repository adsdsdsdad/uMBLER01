-- Script de configuração do banco de dados para produção
-- Execute este script após criar o banco PostgreSQL

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabelas principais
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(255) UNIQUE NOT NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(255),
    customer_email VARCHAR(255),
    agent_name VARCHAR(255) NOT NULL DEFAULT 'Atendente',
    status VARCHAR(50) DEFAULT 'active',
    is_site_customer BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(255) NOT NULL,
    message_id VARCHAR(255) UNIQUE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'agent')),
    sender_name VARCHAR(255),
    message_text TEXT,
    message_type VARCHAR(50) DEFAULT 'text',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS response_times (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(255) NOT NULL,
    customer_message_id VARCHAR(255) NOT NULL,
    agent_message_id VARCHAR(255),
    customer_message_time TIMESTAMP WITH TIME ZONE NOT NULL,
    agent_response_time TIMESTAMP WITH TIME ZONE,
    response_time_seconds INTEGER CHECK (response_time_seconds > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_id ON conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_name);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);

CREATE INDEX IF NOT EXISTS idx_response_times_conversation ON response_times(conversation_id);
CREATE INDEX IF NOT EXISTS idx_response_times_response_time ON response_times(response_time_seconds);

-- Criar constraints de validação
ALTER TABLE conversations ADD CONSTRAINT check_agent_name_not_empty 
    CHECK (agent_name IS NOT NULL AND agent_name != '' AND agent_name != 'Sistema');

ALTER TABLE messages ADD CONSTRAINT check_sender_type_valid 
    CHECK (sender_type IN ('customer', 'agent'));

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar triggers para atualizar updated_at
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de exemplo (opcional)
INSERT INTO conversations (conversation_id, customer_name, agent_name, status) 
VALUES 
    ('demo_001', 'Cliente Demo', 'Agente Demo', 'active'),
    ('demo_002', 'Cliente Teste', 'Agente Teste', 'closed')
ON CONFLICT (conversation_id) DO NOTHING;

-- Verificar estrutura criada
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('conversations', 'messages', 'response_times')
ORDER BY table_name, ordinal_position;