# Guia de Deploy - Sistema de Atendimento em Tempo Real

## 🚀 Preparação para Produção

### 1. Configuração do Banco de Dados

#### Opção A: Neon (Recomendado)
1. Acesse [neon.tech](https://neon.tech)
2. Crie uma nova conta ou faça login
3. Crie um novo projeto
4. Copie a string de conexão
5. Execute o script de setup: `scripts/setup-database.sql`

#### Opção B: PostgreSQL Local/Cloud
1. Instale PostgreSQL 14+
2. Crie um banco de dados
3. Execute o script de setup: `scripts/setup-database.sql`

### 2. Variáveis de Ambiente

Crie um arquivo `.env.local` com:

\`\`\`env
# Banco de Dados
DATABASE_URL=postgresql://usuario:senha@host:porta/banco

# Configurações da Umbler (opcional)
UMBLER_WEBHOOK_SECRET=seu_secret_aqui

# Configurações da Aplicação
NEXT_PUBLIC_APP_NAME="Sistema de Atendimento"
NEXT_PUBLIC_APP_VERSION="1.0.0"

# Configurações de Log
LOG_LEVEL=info
\`\`\`

### 3. Configuração da Umbler

1. Acesse o painel da Umbler
2. Configure o webhook para: `https://seu-dominio.com/api/webhook/umbler`
3. Adicione o secret se configurado

## 🏗️ Deploy

### Opção A: Vercel (Recomendado)

1. **Conectar ao GitHub**
   \`\`\`bash
   # Faça push do código para o GitHub
   git add .
   git commit -m "Preparando para produção"
   git push origin main
   \`\`\`

2. **Deploy no Vercel**
   - Acesse [vercel.com](https://vercel.com)
   - Conecte seu repositório GitHub
   - Configure as variáveis de ambiente
   - Deploy automático

3. **Configurar Domínio**
   - Adicione seu domínio personalizado
   - Configure SSL automaticamente

### Opção B: Netlify

1. **Conectar ao GitHub**
   - Acesse [netlify.com](https://netlify.com)
   - Conecte seu repositório

2. **Configurar Build**
   \`\`\`bash
   Build command: npm run build
   Publish directory: .next
   \`\`\`

3. **Variáveis de Ambiente**
   - Configure no painel do Netlify

### Opção C: AWS/Outros

1. **Build da Aplicação**
   \`\`\`bash
   npm run build
   npm run start
   \`\`\`

2. **Configurar Proxy Reverso**
   - Nginx ou Apache
   - SSL/TLS
   - Headers de segurança

## 🔧 Configurações de Produção

### 1. Otimizações de Performance

\`\`\`javascript
// next.config.mjs
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  // Headers de segurança já configurados
}
\`\`\`

### 2. Monitoramento

- **Logs**: Configure logs estruturados
- **Métricas**: Monitore performance do banco
- **Alertas**: Configure alertas para erros

### 3. Backup

- **Banco de Dados**: Backup automático diário
- **Código**: Versionamento no GitHub
- **Configurações**: Documente todas as configurações

## 🧪 Testes Pós-Deploy

### 1. Verificar Funcionalidades

- [ ] Dashboard carrega corretamente
- [ ] Webhook recebe eventos da Umbler
- [ ] Dados são salvos no banco
- [ ] Métricas são calculadas
- [ ] Interface atualiza em tempo real

### 2. Testes de Performance

- [ ] Tempo de resposta da API
- [ ] Performance do banco de dados
- [ ] Uso de memória e CPU
- [ ] Tempo de carregamento da interface

### 3. Testes de Segurança

- [ ] Headers de segurança configurados
- [ ] Validação de entrada
- [ ] Rate limiting (se necessário)
- [ ] Logs de auditoria

## 📊 Monitoramento em Produção

### 1. Métricas Importantes

- **Tempo de resposta da API**: < 200ms
- **Uso de CPU**: < 70%
- **Uso de memória**: < 80%
- **Tempo de resposta do banco**: < 100ms

### 2. Logs a Monitorar

- Erros de webhook
- Falhas de conexão com banco
- Tempos de resposta lentos
- Uso de recursos

### 3. Alertas Recomendados

- Erro 500 na API
- Tempo de resposta > 1s
- Falha de conexão com banco
- Uso de CPU > 80%

## 🔄 Manutenção

### 1. Atualizações

- **Código**: Deploy automático via GitHub
- **Dependências**: Atualize mensalmente
- **Banco**: Backup antes de alterações

### 2. Backup e Restore

\`\`\`bash
# Backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20241201.sql
\`\`\`

### 3. Troubleshooting

- **Logs**: Verifique logs da aplicação
- **Banco**: Teste conexão e queries
- **Webhook**: Verifique recebimento de eventos
- **Performance**: Monitore métricas

## 📞 Suporte

- **Documentação**: README.md e este guia
- **Issues**: GitHub Issues para bugs
- **Logs**: Verifique logs da aplicação
- **Métricas**: Monitore performance

---

**Última Atualização**: Dezembro 2024  
**Versão**: 1.0.0  
**Status**: Produção
