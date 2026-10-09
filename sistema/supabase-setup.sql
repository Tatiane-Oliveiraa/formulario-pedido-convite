-- ═══════════════════════════════════════════════════════════════
-- Raíz & Pixel — Setup do Banco de Dados (Supabase / PostgreSQL)
-- Cole este script inteiro no SQL Editor do Supabase e clique em Run
-- ═══════════════════════════════════════════════════════════════

-- ── Função para atualizar updated_at automaticamente ────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ── Tabela: clientes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id          VARCHAR(36)  PRIMARY KEY,
  nome        VARCHAR(255) NOT NULL,
  cpf         VARCHAR(14)  NOT NULL UNIQUE,
  telefone    VARCHAR(20)  DEFAULT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_clientes_updated_at ON clientes;
CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Tabela: pedidos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos (
  id                    VARCHAR(36)    PRIMARY KEY,
  cliente_id            VARCHAR(36)    REFERENCES clientes(id),
  nome_aniversariante   VARCHAR(255)   DEFAULT NULL,
  data_evento           DATE           DEFAULT NULL,
  hora_evento           TIME           DEFAULT NULL,
  local_evento          TEXT           DEFAULT NULL,
  tema_festa            VARCHAR(255)   DEFAULT NULL,
  trilha_sonora         TEXT           DEFAULT NULL,
  dress_code            VARCHAR(255)   DEFAULT NULL,
  paleta_cores          VARCHAR(255)   DEFAULT NULL,
  cores_convite         VARCHAR(255)   DEFAULT NULL,
  confirmacao_presenca  VARCHAR(100)   DEFAULT NULL,
  whatsapp_confirmacao  VARCHAR(20)    DEFAULT NULL,
  mensagem_confirmacao  TEXT           DEFAULT NULL,
  sugestoes_presente    TEXT           DEFAULT NULL,
  chave_pix             VARCHAR(255)   DEFAULT NULL,
  manual_convidado      TEXT           DEFAULT NULL,
  outros_detalhes       TEXT           DEFAULT NULL,
  observacoes           TEXT           DEFAULT NULL,
  modelo                VARCHAR(255)   DEFAULT NULL,
  botoes_interativos    TEXT           DEFAULT NULL,
  complementos          TEXT           DEFAULT NULL,
  album_fotos           VARCHAR(100)   DEFAULT 'Nenhum',
  tipo_confirmacao      VARCHAR(100)   DEFAULT NULL,
  forma_pagamento       VARCHAR(100)   DEFAULT NULL,
  subtotal              DECIMAL(10,2)  DEFAULT 0.00,
  valor_total           DECIMAL(10,2)  DEFAULT 0.00,
  valor_sinal           DECIMAL(10,2)  DEFAULT 0.00,
  valor_restante        DECIMAL(10,2)  DEFAULT 0.00,
  status                VARCHAR(50)    DEFAULT 'Novo',
  link_canva            VARCHAR(500)   DEFAULT NULL,
  link_convite          VARCHAR(500)   DEFAULT NULL,
  aceite_termos         SMALLINT       DEFAULT 0,
  texto_termos          TEXT           DEFAULT NULL,
  precisa_repostar      SMALLINT       DEFAULT 0,
  data_repostagem       DATE           DEFAULT NULL,
  observacoes_internas  TEXT           DEFAULT NULL,
  itens_extras          TEXT           DEFAULT NULL,
  data_fechamento       DATE           DEFAULT NULL,
  data_entrega          DATE           DEFAULT NULL,
  created_at            TIMESTAMPTZ    DEFAULT NOW(),
  updated_at            TIMESTAMPTZ    DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_pedidos_updated_at ON pedidos;
CREATE TRIGGER trg_pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Tabela: financeiro ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financeiro (
  id              VARCHAR(36)   PRIMARY KEY,
  pedido_id       VARCHAR(36)   DEFAULT NULL,
  tipo            VARCHAR(20)   NOT NULL CHECK (tipo IN ('entrada','saida')),
  descricao       VARCHAR(255)  NOT NULL,
  valor           DECIMAL(10,2) NOT NULL,
  data            DATE          NOT NULL,
  forma_pagamento VARCHAR(100)  DEFAULT NULL,
  categoria       VARCHAR(100)  DEFAULT NULL,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ── Tabela: produtos ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS produtos (
  id            VARCHAR(36)   PRIMARY KEY,
  categoria     VARCHAR(50)   NOT NULL CHECK (categoria IN ('modelo','complemento','album','confirmacao')),
  subcategoria  VARCHAR(100)  DEFAULT NULL,
  nome          VARCHAR(255)  NOT NULL,
  preco         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  observacao    VARCHAR(255)  DEFAULT NULL,
  ativo         SMALLINT      NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_produtos_updated_at ON produtos;
CREATE TRIGGER trg_produtos_updated_at
  BEFORE UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Desabilitar Row Level Security (acesso controlado pelo backend) ──
ALTER TABLE clientes   DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos    DISABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro DISABLE ROW LEVEL SECURITY;
ALTER TABLE produtos   DISABLE ROW LEVEL SECURITY;

-- ── Produtos padrão (28 itens) ───────────────────────────────────

-- Modelos adulto
INSERT INTO produtos (id, categoria, subcategoria, nome, preco) VALUES
  (gen_random_uuid()::text, 'modelo', 'adulto', 'Convite Interativo Luxo', 79.99),
  (gen_random_uuid()::text, 'modelo', 'adulto', 'Convite Interativo Premium', 95.00),
  (gen_random_uuid()::text, 'modelo', 'adulto', 'Convite Interativo Gold', 130.00),
  (gen_random_uuid()::text, 'modelo', 'adulto', 'Convite Interativo Gold II', 160.00),
  (gen_random_uuid()::text, 'modelo', 'adulto', 'Convite Interativo Infinito', 99.00),
  (gen_random_uuid()::text, 'modelo', 'adulto', 'Convite Interativo Especial Plus', 110.00);

-- Modelos infantil
INSERT INTO produtos (id, categoria, subcategoria, nome, preco) VALUES
  (gen_random_uuid()::text, 'modelo', 'infantil', 'Convite Tradicional', 24.99),
  (gen_random_uuid()::text, 'modelo', 'infantil', 'Convite Interativo Simples', 35.00),
  (gen_random_uuid()::text, 'modelo', 'infantil', 'Convite Interativo Musical', 40.00),
  (gen_random_uuid()::text, 'modelo', 'infantil', 'Convite Interativo Plus', 45.00),
  (gen_random_uuid()::text, 'modelo', 'infantil', 'Convite Interativo Especial', 60.00),
  (gen_random_uuid()::text, 'modelo', 'infantil', 'Convite Interativo Luxo Infantil', 80.00),
  (gen_random_uuid()::text, 'modelo', 'infantil', 'Convite Interativo Premium Infantil', 95.00),
  (gen_random_uuid()::text, 'modelo', 'infantil', 'Convite Interativo Gold Infantil', 130.00),
  (gen_random_uuid()::text, 'modelo', 'infantil', 'Convite Interativo Gold II Infantil', 199.00);

-- Complementos
INSERT INTO produtos (id, categoria, nome, preco) VALUES
  (gen_random_uuid()::text, 'complemento', 'Save the Date Estático', 30.00),
  (gen_random_uuid()::text, 'complemento', 'Save the Date Vídeo', 60.00),
  (gen_random_uuid()::text, 'complemento', 'Mascote Personalizado (1 posição)', 89.90),
  (gen_random_uuid()::text, 'complemento', 'Mascote Personalizado (3 posições)', 120.00),
  (gen_random_uuid()::text, 'complemento', 'Filtro + Placa QrCode', 39.99),
  (gen_random_uuid()::text, 'complemento', 'Ensaio fotográfico em IA', 79.90),
  (gen_random_uuid()::text, 'complemento', 'Foto no modelo do convite', 10.00),
  (gen_random_uuid()::text, 'complemento', 'Taxa de urgência 24h', 30.00);

-- Álbuns
INSERT INTO produtos (id, categoria, nome, preco, observacao) VALUES
  (gen_random_uuid()::text, 'album', 'Plano Basic', 149.00, 'Até 500 fotos, 10 vídeos, 10 storys, 5 dias'),
  (gen_random_uuid()::text, 'album', 'Plano Pro', 197.00, 'Fotos, vídeos e storys ilimitados, 10 dias');

-- Confirmações
INSERT INTO produtos (id, categoria, nome, preco, observacao) VALUES
  (gen_random_uuid()::text, 'confirmacao', 'WhatsApp', 0.00, 'Sem custo adicional'),
  (gen_random_uuid()::text, 'confirmacao', 'Formulário Simples', 29.99, 'Com acesso à planilha'),
  (gen_random_uuid()::text, 'confirmacao', 'Formulário com QR Code', 59.99, 'Com QR Code integrado');

-- Verificação final
SELECT categoria, COUNT(*) as total FROM produtos GROUP BY categoria ORDER BY categoria;
