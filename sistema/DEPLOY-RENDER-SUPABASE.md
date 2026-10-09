# 🚀 Como fazer o Deploy — Render + Supabase

## O que você vai ter no final:
- ✅ Formulário público acessível por qualquer cliente
- ✅ Dados salvos na nuvem (Supabase) — grátis para sempre
- ✅ Backup automático semanal no seu computador
- ✅ Sistema funcionando no seu PC sem precisar do XAMPP

---

## PARTE 1 — Configurar o Banco de Dados (Supabase)

### Passo 1 — Criar as tabelas
1. Acesse [supabase.com](https://supabase.com) e entre no seu projeto
2. No menu lateral esquerdo, clique em **"SQL Editor"**
3. Clique em **"New query"**
4. Abra o arquivo `supabase-setup.sql` (na pasta `sistema/`) com o Bloco de Notas
5. Copie **todo o conteúdo** e cole no SQL Editor
6. Clique em **"Run"** (botão verde)
7. Deve aparecer uma tabela mostrando os 28 produtos criados ✅

### Passo 2 — Pegar as credenciais do banco
1. No Supabase, clique em **"Project Settings"** (ícone de engrenagem)
2. Clique em **"Database"**
3. Role até **"Connection parameters"** e anote:
   - **Host** (algo como: `db.xxxxxxxxxxx.supabase.co`)
   - **Database name**: `postgres`
   - **User**: `postgres`
   - **Password**: a senha que você criou ao criar o projeto
   - **Port**: `5432`

---

## PARTE 2 — Subir a API no Render

### Passo 1 — Preparar os arquivos para o GitHub
> O Render precisa que seus arquivos estejam no GitHub para fazer o deploy.

1. Acesse [github.com](https://github.com) e crie uma conta gratuita (se não tiver)
2. Crie um **novo repositório** (pode ser privado):
   - Nome: `raiz-pixel-sistema`
   - Marque: Private ✅
3. Faça upload da pasta `formulario-pedido` inteira para esse repositório

### Passo 2 — Criar o serviço no Render
1. Acesse [render.com](https://render.com) e entre na sua conta
2. Clique em **"New +"** → **"Web Service"**
3. Conecte com sua conta do GitHub
4. Selecione o repositório `raiz-pixel-sistema`
5. Configure:
   - **Name**: `raiz-pixel-api`
   - **Root Directory**: deixe vazio
   - **Runtime**: **Docker** (selecione Docker)
   - **Dockerfile Path**: `./sistema/Dockerfile`

### Passo 3 — Configurar as variáveis de ambiente
Na tela de configuração do Render, role até **"Environment Variables"** e adicione:

| Nome da variável | Valor |
|---|---|
| `DB_DRIVER` | `pgsql` |
| `DB_HOST` | *(Host do Supabase — do Passo 2 da Parte 1)* |
| `DB_PORT` | `5432` |
| `DB_NAME` | `postgres` |
| `DB_USER` | `postgres` |
| `DB_PASS` | *(Senha do Supabase)* |

6. Clique em **"Create Web Service"**
7. Aguarde ~5 minutos o build terminar (aparece "Live" em verde)
8. **Anote a URL** — será algo como: `https://raiz-pixel-api.onrender.com`

---

## PARTE 3 — Atualizar o Sistema Local

### Passo 1 — Apontar o sistema para o Render
1. Abra o arquivo `sistema/app.html` com o Bloco de Notas
2. Procure a linha: `window.RP_API_URL = 'http://localhost/sistema/api';`
3. Substitua pela URL do Render:
   ```
   window.RP_API_URL = 'https://raiz-pixel-api.onrender.com/api';
   ```
4. Salve o arquivo

### Passo 2 — Atualizar o formulário público
1. Abra `formulario-pedido/index.html` com o Bloco de Notas
2. Procure: `http://localhost/sistema/api/receber-pedido.php`
3. Substitua pela URL do Render:
   ```
   https://raiz-pixel-api.onrender.com/api/receber-pedido.php
   ```
4. Salve o arquivo

---

## PARTE 4 — Importar dados da Hostinger (se tiver)

1. Envie o arquivo `sistema/api/exportar-dados.php` para a Hostinger
2. Acesse: `https://[seu-site]/sistema/api/exportar-dados.php`
3. Baixe o arquivo JSON com seus dados
4. Abra o sistema local: `http://localhost/sistema/app.html`
5. Clique em **"📂 Restaurar"** na sidebar
6. Selecione o arquivo JSON baixado
7. Aguarde a importação ✅

---

## ✅ Pronto! Como fica seu dia a dia:

| Situação | O que acontece |
|---|---|
| Cliente preenche formulário | Dados vão direto para o Supabase |
| Você abre o sistema | Lê dados do Supabase em tempo real |
| Todo sábado (automático) | Backup JSON baixa no seu computador |
| Clicar em "💾 Backup" | Baixa backup na hora |
| Internet cai | Sistema fica indisponível momentaneamente |

---

## ⚠️ Importante

- **Supabase**: se não usar o sistema por **7 dias**, o projeto pausa. Retoma ao abrir o sistema.
- **Render**: o serviço pode demorar ~30 segundos para responder após ficar inativo por 15 minutos (plano gratuito).
- **Backup**: clique em "💾 Backup" pelo menos uma vez por mês além do automático!

---

## 🆘 Problemas comuns

| Problema | Solução |
|---|---|
| Sistema não carrega dados | Verificar se Render está "Live" no painel |
| Formulário não envia | Confirmar URL do Render no index.html |
| Supabase pausado | Entrar em supabase.com e clicar "Resume" |
| Erro de conexão | Verificar variáveis de ambiente no Render |
