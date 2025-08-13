# Sistema de Atendimento em Tempo Real

Sistema completo de atendimento ao cliente com integração em tempo real, métricas de performance e dashboard de monitoramento.

## 🚀 Funcionalidades

- **Atendimento em Tempo Real**: Monitoramento instantâneo de conversas ativas
- **Integração com Umbler**: Webhook para receber mensagens e eventos de chat
- **Métricas de Performance**: Tempo de resposta, volume de mensagens e estatísticas por agente
- **Dashboard Inteligente**: Interface moderna para acompanhamento de atendimentos
- **Sistema de Agentes**: Atribuição e transferência de conversas entre atendentes
- **Histórico Completo**: Armazenamento de todas as conversas e mensagens

## 🏗️ Arquitetura

- **Frontend**: Next.js 14 com TypeScript e Tailwind CSS
- **Backend**: API Routes do Next.js com integração direta ao banco
- **Banco de Dados**: PostgreSQL com Neon (serverless)
- **Integração**: Webhook para receber eventos da plataforma Umbler
- **Tempo Real**: Polling automático para atualizações em tempo real

## 📊 Principais Componentes

### 1. Webhook Umbler (`/api/webhook/umbler`)
- Recebe eventos de mensagens, fechamento de chat e transferências
- Processa automaticamente o tipo de remetente (cliente/agente)
- Calcula tempos de resposta em tempo real
- Atualiza status das conversas automaticamente

### 2. Dashboard de Métricas (`/conversations`)
- Visão geral de todas as conversas
- Filtros por agente, status e tags
- Estatísticas de performance por atendente
- Análise de tempo de resposta

### 3. Lista em Tempo Real (`/`)
- Monitoramento instantâneo de conversas ativas
- Indicador de conectividade em tempo real
- Atualizações automáticas a cada 10 segundos
- Visualização rápida do status dos atendimentos

### 4. Sistema de Banco de Dados
- **conversations**: Dados das conversas e atribuições
- **messages**: Histórico completo de mensagens
- **response_times**: Métricas de tempo de resposta

## 🔧 Configuração

### Variáveis de Ambiente
```env
DATABASE_URL=sua_url_do_neon_postgresql
```

### Instalação
```bash
# Instalar dependências
pnpm install

# Executar em desenvolvimento
pnpm dev

# Build para produção
pnpm build
```

## 📱 Uso

### Para Clientes
1. Acesse o dashboard principal em `/`
2. Visualize conversas ativas em tempo real
3. Monitore métricas de performance

### Para Desenvolvedores
1. Configure o webhook da Umbler para `/api/webhook/umbler`
2. Ajuste as variáveis de ambiente
3. Execute as migrações do banco de dados

## 🎯 Recursos Técnicos

- **TypeScript**: Tipagem completa para maior segurança
- **Responsivo**: Interface adaptável para todos os dispositivos
- **Performance**: Otimizações para carregamento rápido
- **Escalável**: Arquitetura preparada para crescimento
- **Monitoramento**: Logs detalhados para debugging

## 🔄 Fluxo de Dados

1. **Cliente envia mensagem** → Umbler processa
2. **Webhook recebe evento** → Sistema identifica tipo
3. **Dados são salvos** → Conversa e mensagem registradas
4. **Métricas calculadas** → Tempo de resposta atualizado
5. **Dashboard atualiza** → Interface reflete mudanças
6. **Agente responde** → Ciclo se repete

## 📈 Métricas Disponíveis

- Total de conversas por agente
- Tempo médio de resposta
- Volume de mensagens
- Status das conversas
- Performance por período

## 🚀 Deploy

O sistema está preparado para deploy em:
- Vercel
- Netlify
- AWS
- Qualquer plataforma que suporte Next.js

## 📞 Suporte

Para dúvidas técnicas ou suporte, consulte a documentação da API ou entre em contato com a equipe de desenvolvimento.

---

**Versão**: 1.0.0  
**Última Atualização**: Dezembro 2024  
**Status**: Produção