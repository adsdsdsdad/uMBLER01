# 🚀 INSTRUÇÕES PARA FAZER O WEBHOOK FUNCIONAR

## ✅ **CORREÇÕES JÁ IMPLEMENTADAS**

### 1. **Tabela Corrigida**
- Adicionado campo `is_site_customer` na tabela `conversations`
- Execute o script SQL atualizado: `scripts/001-create-tables.sql`

### 2. **Webhook Simplificado e Corrigido**
- Lógica simplificada para captura do nome do agente
- Debug melhorado para identificar problemas
- Código mais robusto para Vercel

### 3. **Script de Teste Criado**
- `scripts/test-webhook-simple.js` para testar o webhook

## 🔧 **PASSOS PARA FUNCIONAR**

### **Passo 1: Atualizar o Banco de Dados**
```sql
-- Execute este comando no seu banco Neon
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_site_customer BOOLEAN DEFAULT FALSE;
```

### **Passo 2: Fazer Deploy na Vercel**
```bash
git add .
git commit -m "Webhook corrigido e otimizado"
git push origin main
```

### **Passo 3: Configurar Variáveis de Ambiente na Vercel**
- `DATABASE_URL` - URL do seu banco Neon
- Verificar se está configurado corretamente

### **Passo 4: Testar o Webhook**
1. Altere a URL no arquivo `scripts/test-webhook-simple.js`
2. Execute: `node scripts/test-webhook-simple.js`

## 🎯 **COMO FUNCIONA AGORA**

### **Captura do Nome do Agente:**
- **Mensagens de agente**: Captura de `lastMessage.Member`
- **Mensagens de cliente**: Mantém agente responsável de `chatData.OrganizationMember`

### **Identificação do Tipo de Mensagem:**
- Baseado no campo `Source` da mensagem
- Fallback inteligente se `Source` não estiver disponível

### **Debug Completo:**
- Logs detalhados para cada etapa
- Identificação clara de onde está o problema

## 🐛 **POSSÍVEIS PROBLEMAS E SOLUÇÕES**

### **Problema 1: Campo `is_site_customer` não existe**
```sql
-- Solução: Adicionar o campo
ALTER TABLE conversations ADD COLUMN is_site_customer BOOLEAN DEFAULT FALSE;
```

### **Problema 2: Erro de conexão com banco**
- Verificar `DATABASE_URL` na Vercel
- Verificar se o banco Neon está ativo

### **Problema 3: Webhook não recebe dados**
- Verificar logs na Vercel
- Verificar se a URL está correta
- Testar com o script de teste

## 📊 **LOGS PARA VERIFICAR**

### **Logs de Sucesso:**
```
🔄 Webhook Umbler recebido: {...}
🔍 === DEBUG DADOS COMPLETOS ===
📊 sender_type determinado: "agent"
🎧 === NOME DO AGENTE QUE ENVIOU ===
✅ Nome capturado: Maria Atendente
💾 Mensagem salva no banco: ✅ Sucesso
```

### **Logs de Erro:**
```
❌ Erro ao processar webhook Umbler: Error: ...
```

## 🔍 **VERIFICAÇÃO FINAL**

1. ✅ Banco de dados atualizado
2. ✅ Código corrigido e simplificado
3. ✅ Deploy na Vercel feito
4. ✅ Variáveis de ambiente configuradas
5. ✅ Webhook testado e funcionando

## 📞 **SUPORTE**

Se ainda houver problemas:
1. Verificar logs na Vercel
2. Executar script de teste
3. Verificar estrutura dos dados recebidos da Umbler
4. Comparar com os logs de debug

---

**🎉 Agora o webhook deve funcionar perfeitamente e capturar corretamente o nome do atendente!**