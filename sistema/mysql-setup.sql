-- ==============================================================================
-- Script de Configuração do Banco de Dados MySQL (Migração do Supabase)
-- ==============================================================================
-- Instruções:
-- Este script foi adaptado para ser executado no phpMyAdmin (ex: Hostinger).
-- Ele cria as tabelas "clientes", "pedidos" e "financeiro" com chaves 
-- estrangeiras, índices e codificação utf8mb4.
-- ==============================================================================

SET NAMES utf8mb4;
SET SQL_MODE = 'STRICT_TRANS_TABLES';

CREATE TABLE IF NOT EXISTS clientes (
  id CHAR(36) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(255) UNIQUE NOT NULL,
  telefone VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedidos (
  id CHAR(36) PRIMARY KEY,
  cliente_id CHAR(36),
  nome_aniversariante VARCHAR(255),
  data_evento DATE,
  hora_evento TIME,
  local_evento VARCHAR(500),
  tema_festa VARCHAR(255),
  trilha_sonora VARCHAR(255),
  dress_code VARCHAR(255),
  paleta_cores VARCHAR(255),
  cores_convite VARCHAR(255),
  confirmacao_presenca VARCHAR(255),
  whatsapp_confirmacao VARCHAR(255),
  mensagem_confirmacao TEXT,
  sugestoes_presente TEXT,
  chave_pix VARCHAR(255),
  manual_convidado TEXT,
  outros_detalhes TEXT,
  observacoes TEXT,
  modelo VARCHAR(255),
  botoes_interativos VARCHAR(500),
  complementos VARCHAR(500),
  album_fotos VARCHAR(255) DEFAULT 'Nenhum',
  forma_pagamento VARCHAR(255),
  subtotal DECIMAL(10,2) DEFAULT 0,
  valor_total DECIMAL(10,2) DEFAULT 0,
  aceite_termos TINYINT(1) DEFAULT 1,
  texto_termos TEXT,
  status ENUM('Novo','Fechado','Em Produção','Aguardando Aprovação','Aprovado','Entregue','Cancelado') DEFAULT 'Novo',
  valor_sinal DECIMAL(10,2) DEFAULT 0,
  valor_restante DECIMAL(10,2) DEFAULT 0,
  data_fechamento DATE,
  data_entrega DATE,
  link_canva VARCHAR(500),
  link_convite VARCHAR(500),
  precisa_repostar TINYINT(1) DEFAULT 0,
  data_repostagem DATE,
  observacoes_internas TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS financeiro (
  id CHAR(36) PRIMARY KEY,
  tipo ENUM('entrada','saida') NOT NULL,
  descricao VARCHAR(500) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data DATE NOT NULL,
  pedido_id CHAR(36),
  categoria VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices
CREATE INDEX idx_pedidos_status ON pedidos(status);
CREATE INDEX idx_pedidos_data_evento ON pedidos(data_evento);
CREATE INDEX idx_financeiro_data ON financeiro(data);
CREATE INDEX idx_financeiro_tipo ON financeiro(tipo);
