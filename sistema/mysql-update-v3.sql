-- ═══════════════════════════════════════════════════════════════
-- Raíz & Pixel — Atualização v3: Tabela de Produtos
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS produtos (
  id VARCHAR(36) PRIMARY KEY,
  categoria ENUM('modelo','complemento','album','confirmacao') NOT NULL,
  subcategoria VARCHAR(100) DEFAULT NULL COMMENT 'Ex: adulto, infantil',
  nome VARCHAR(255) NOT NULL,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  observacao VARCHAR(255) DEFAULT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Modelos de Convite — Adulto
INSERT INTO produtos (id, categoria, subcategoria, nome, preco) VALUES
  (UUID(), 'modelo', 'adulto', 'Convite Interativo Luxo', 79.99),
  (UUID(), 'modelo', 'adulto', 'Convite Interativo Premium', 95.00),
  (UUID(), 'modelo', 'adulto', 'Convite Interativo Gold', 130.00),
  (UUID(), 'modelo', 'adulto', 'Convite Interativo Gold II', 160.00),
  (UUID(), 'modelo', 'adulto', 'Convite Interativo Infinito', 99.00),
  (UUID(), 'modelo', 'adulto', 'Convite Interativo Especial Plus', 110.00);

-- Modelos de Convite — Infantil
INSERT INTO produtos (id, categoria, subcategoria, nome, preco) VALUES
  (UUID(), 'modelo', 'infantil', 'Convite Tradicional', 24.99),
  (UUID(), 'modelo', 'infantil', 'Convite Interativo Simples', 35.00),
  (UUID(), 'modelo', 'infantil', 'Convite Interativo Musical', 40.00),
  (UUID(), 'modelo', 'infantil', 'Convite Interativo Plus', 45.00),
  (UUID(), 'modelo', 'infantil', 'Convite Interativo Especial', 60.00),
  (UUID(), 'modelo', 'infantil', 'Convite Interativo Luxo Infantil', 80.00),
  (UUID(), 'modelo', 'infantil', 'Convite Interativo Premium Infantil', 95.00),
  (UUID(), 'modelo', 'infantil', 'Convite Interativo Gold Infantil', 130.00),
  (UUID(), 'modelo', 'infantil', 'Convite Interativo Gold II Infantil', 199.00);

-- Complementos
INSERT INTO produtos (id, categoria, nome, preco) VALUES
  (UUID(), 'complemento', 'Save the Date Estático', 30.00),
  (UUID(), 'complemento', 'Save the Date Vídeo', 60.00),
  (UUID(), 'complemento', 'Mascote Personalizado (1 posição)', 89.90),
  (UUID(), 'complemento', 'Mascote Personalizado (3 posições)', 120.00),
  (UUID(), 'complemento', 'Filtro + Placa QrCode', 39.99),
  (UUID(), 'complemento', 'Ensaio fotográfico em IA', 79.90),
  (UUID(), 'complemento', 'Foto no modelo do convite', 10.00),
  (UUID(), 'complemento', 'Taxa de urgência 24h', 30.00);

-- Álbum de Fotos
INSERT INTO produtos (id, categoria, nome, preco, observacao) VALUES
  (UUID(), 'album', 'Plano Basic', 149.00, 'Até 500 fotos, 10 vídeos, 10 storys, 5 dias de armazenamento'),
  (UUID(), 'album', 'Plano Pro', 197.00, 'Fotos, vídeos e storys ilimitados, 10 dias de armazenamento');

-- Confirmação de Presença
INSERT INTO produtos (id, categoria, nome, preco, observacao) VALUES
  (UUID(), 'confirmacao', 'WhatsApp', 0.00, 'Sem custo adicional'),
  (UUID(), 'confirmacao', 'Formulário Simples', 29.99, 'Com acesso à planilha'),
  (UUID(), 'confirmacao', 'Formulário com QR Code', 59.99, 'Com QR Code integrado');
