-- ==============================================================================
-- Script para ATUALIZAR o banco já existente com os novos campos
-- Execute este script no phpMyAdmin se você já criou as tabelas antes
-- ==============================================================================

SET NAMES utf8mb4;

-- Adicionar telefone na tabela de clientes
ALTER TABLE clientes ADD COLUMN telefone VARCHAR(20) AFTER cpf;

-- Adicionar novos campos na tabela de pedidos
ALTER TABLE pedidos ADD COLUMN cores_convite VARCHAR(255) AFTER paleta_cores;
ALTER TABLE pedidos ADD COLUMN mensagem_confirmacao TEXT AFTER whatsapp_confirmacao;
ALTER TABLE pedidos ADD COLUMN manual_convidado TEXT AFTER chave_pix;
ALTER TABLE pedidos ADD COLUMN album_fotos VARCHAR(255) DEFAULT 'Nenhum' AFTER complementos;
