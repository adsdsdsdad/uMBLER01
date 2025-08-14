-- Adicionando suporte a horário de atendimento
-- Script para adicionar campos relacionados ao horário de atendimento

-- Adicionar campos na tabela response_times para rastrear horário de atendimento
ALTER TABLE response_times 
ADD COLUMN IF NOT EXISTS customer_outside_hours BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS agent_outside_hours BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS business_hours_status VARCHAR(100) DEFAULT 'Dentro do horário';

-- Criar índice para consultas por horário de atendimento
CREATE INDEX IF NOT EXISTS idx_response_times_business_hours ON response_times(customer_outside_hours, agent_outside_hours);

-- Adicionar comentários explicativos
COMMENT ON COLUMN response_times.customer_outside_hours IS 'Indica se a mensagem do cliente foi enviada fora do horário de atendimento';
COMMENT ON COLUMN response_times.agent_outside_hours IS 'Indica se a resposta do agente foi enviada fora do horário de atendimento';
COMMENT ON COLUMN response_times.business_hours_status IS 'Status descritivo do horário de atendimento (Dentro do horário, Cliente fora do horário, Atendente fora do horário, Ambos fora do horário)';

-- Atualizar registros existentes (opcional - para dados históricos)
-- UPDATE response_times 
-- SET 
--   customer_outside_hours = CASE 
--     WHEN EXTRACT(DOW FROM customer_message_time) = 0 THEN TRUE -- Domingo
--     WHEN EXTRACT(DOW FROM customer_message_time) = 6 AND EXTRACT(HOUR FROM customer_message_time) NOT BETWEEN 8 AND 11 THEN TRUE -- Sábado
--     WHEN EXTRACT(DOW FROM customer_message_time) BETWEEN 1 AND 5 AND EXTRACT(HOUR FROM customer_message_time) NOT BETWEEN 8 AND 17 THEN TRUE -- Segunda a Sexta
--     ELSE FALSE
--   END,
--   agent_outside_hours = CASE 
--     WHEN EXTRACT(DOW FROM agent_response_time) = 0 THEN TRUE -- Domingo
--     WHEN EXTRACT(DOW FROM agent_response_time) = 6 AND EXTRACT(HOUR FROM agent_response_time) NOT BETWEEN 8 AND 11 THEN TRUE -- Sábado
--     WHEN EXTRACT(DOW FROM agent_response_time) BETWEEN 1 AND 5 AND EXTRACT(HOUR FROM agent_response_time) NOT BETWEEN 8 AND 17 THEN TRUE -- Segunda a Sexta
--     ELSE FALSE
--   END,
--   business_hours_status = CASE 
--     WHEN EXTRACT(DOW FROM customer_message_time) = 0 OR EXTRACT(DOW FROM agent_response_time) = 0 THEN 'Ambos fora do horário'
--     WHEN EXTRACT(DOW FROM customer_message_time) = 6 AND EXTRACT(HOUR FROM customer_message_time) NOT BETWEEN 8 AND 11 THEN 'Cliente fora do horário'
--     WHEN EXTRACT(DOW FROM agent_response_time) = 6 AND EXTRACT(HOUR FROM agent_response_time) NOT BETWEEN 8 AND 11 THEN 'Atendente fora do horário'
--     WHEN EXTRACT(DOW FROM customer_message_time) BETWEEN 1 AND 5 AND EXTRACT(HOUR FROM customer_message_time) NOT BETWEEN 8 AND 17 THEN 'Cliente fora do horário'
--     WHEN EXTRACT(DOW FROM agent_response_time) BETWEEN 1 AND 5 AND EXTRACT(HOUR FROM agent_response_time) NOT BETWEEN 8 AND 17 THEN 'Atendente fora do horário'
--     ELSE 'Dentro do horário'
--   END
-- WHERE customer_outside_hours IS NULL OR agent_outside_hours IS NULL OR business_hours_status = 'Dentro do horário';