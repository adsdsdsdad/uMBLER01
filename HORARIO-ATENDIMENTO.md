# Funcionalidade de Horário de Atendimento

## Visão Geral

Esta funcionalidade foi implementada para rastrear e identificar quando as respostas dos atendentes são enviadas fora do horário de atendimento comercial.

## Horário de Atendimento Configurado

- **Segunda a Sexta**: 8h às 18h
- **Sábado**: 8h às 12h  
- **Domingo**: Fechado

## Funcionalidades Implementadas

### 1. Verificação Automática de Horário
- O sistema verifica automaticamente se cada resposta foi enviada dentro do horário de atendimento
- Calcula se tanto a mensagem do cliente quanto a resposta do agente foram enviadas dentro do horário

### 2. Campos Adicionados no Banco de Dados
- `customer_outside_hours`: Indica se a mensagem do cliente foi enviada fora do horário
- `agent_outside_hours`: Indica se a resposta do agente foi enviada fora do horário
- `business_hours_status`: Status descritivo (Dentro do horário, Cliente fora do horário, Atendente fora do horário, Ambos fora do horário)

### 3. Filtros na Interface
- Novo filtro "Horário de Atendimento" na página de conversas
- Opções: "Todos", "Dentro do horário", "Fora do horário"

### 4. Indicadores Visuais
- Badge "Fora do horário" nas conversas que têm respostas fora do horário
- Indicador visual na timeline de mensagens para respostas fora do horário
- Card de estatísticas mostrando quantas respostas foram fora do horário

## Como Aplicar as Mudanças

### 1. Executar a Migração do Banco de Dados
```sql
-- Execute o script scripts/003-add-business-hours-support.sql no seu banco de dados
-- ou execute os comandos SQL manualmente:

ALTER TABLE response_times 
ADD COLUMN IF NOT EXISTS customer_outside_hours BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS agent_outside_hours BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS business_hours_status VARCHAR(100) DEFAULT 'Dentro do horário';

CREATE INDEX IF NOT EXISTS idx_response_times_business_hours ON response_times(customer_outside_hours, agent_outside_hours);
```

### 2. Reiniciar o Servidor
Após aplicar as mudanças no banco de dados, reinicie o servidor para que as novas funcionalidades sejam ativadas.

## Como Funciona

### Cálculo Automático
1. Quando uma mensagem de agente é recebida via webhook
2. O sistema busca a última mensagem do cliente
3. Calcula o tempo de resposta
4. Verifica se ambos os horários estão dentro do período de atendimento
5. Salva as informações no banco de dados

### Exemplos de Status
- **"Dentro do horário"**: Cliente e agente enviaram mensagens dentro do horário
- **"Cliente fora do horário"**: Cliente enviou mensagem fora do horário, agente respondeu dentro
- **"Atendente fora do horário"**: Cliente enviou dentro do horário, agente respondeu fora
- **"Ambos fora do horário"**: Cliente e agente enviaram mensagens fora do horário

## Benefícios

1. **Transparência**: Identifica claramente quando respostas são enviadas fora do horário
2. **Análise de Performance**: Permite analisar padrões de resposta fora do horário
3. **Compliance**: Ajuda a manter controle sobre horários de atendimento
4. **Relatórios**: Facilita a geração de relatórios sobre qualidade do atendimento

## Configuração de Horário

Para alterar o horário de atendimento, edite a função `isOutsideBusinessHours` no arquivo `lib/utils.ts`:

```typescript
export function isOutsideBusinessHours(date: Date): boolean {
  const hour = date.getHours()
  const dayOfWeek = date.getDay()
  
  // Modifique estas regras conforme necessário
  if (dayOfWeek === 0) return true // Domingo
  if (dayOfWeek === 6) return hour < 8 || hour >= 12 // Sábado
  return hour < 8 || hour >= 18 // Segunda a Sexta
}
```

## Monitoramento

- As informações de horário são exibidas nos logs do webhook
- Use o filtro "Fora do horário" para identificar conversas problemáticas
- Monitore o card "Fora do Horário" na página de detalhes da conversa