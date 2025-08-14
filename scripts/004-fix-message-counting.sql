-- Script para corrigir problemas de contagem de mensagens
-- Execute este script para limpar dados incorretos e recalcular métricas

-- 1. Verificar mensagens com sender_type incorreto
SELECT 
  conversation_id,
  sender_type,
  sender_name,
  message_text,
  timestamp
FROM messages 
WHERE sender_type NOT IN ('customer', 'agent')
ORDER BY timestamp DESC;

-- 2. Verificar response_times sem mensagens correspondentes
SELECT 
  rt.conversation_id,
  rt.customer_message_id,
  rt.agent_message_id,
  rt.response_time_seconds
FROM response_times rt
LEFT JOIN messages m1 ON rt.customer_message_id = m1.message_id
LEFT JOIN messages m2 ON rt.agent_message_id = m2.message_id
WHERE m1.message_id IS NULL OR m2.message_id IS NULL;

-- 3. Limpar response_times órfãos (opcional - descomente se necessário)
-- DELETE FROM response_times 
-- WHERE customer_message_id NOT IN (SELECT message_id FROM messages WHERE message_id IS NOT NULL)
-- OR agent_message_id NOT IN (SELECT message_id FROM messages WHERE message_id IS NOT NULL);

-- 4. Recalcular métricas para todas as conversas
-- Este comando pode ser executado via API ou aplicação

-- 5. Verificar estatísticas por conversa
SELECT 
  c.conversation_id,
  c.customer_name,
  c.agent_name,
  COUNT(m.id) as total_messages,
  COUNT(CASE WHEN m.sender_type = 'customer' THEN 1 END) as customer_messages,
  COUNT(CASE WHEN m.sender_type = 'agent' THEN 1 END) as agent_messages,
  COUNT(rt.id) as response_times_count,
  AVG(rt.response_time_seconds) as avg_response_time
FROM conversations c
LEFT JOIN messages m ON c.conversation_id = m.conversation_id
LEFT JOIN response_times rt ON c.conversation_id = rt.conversation_id
GROUP BY c.id, c.conversation_id, c.customer_name, c.agent_name
ORDER BY c.updated_at DESC
LIMIT 10;