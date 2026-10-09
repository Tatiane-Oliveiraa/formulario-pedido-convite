-- ==============================================================================
-- Script de Atualização v2 — Adicionar campo itens_extras
-- Execute este script no phpMyAdmin para adicionar a coluna de itens extras
-- ==============================================================================

SET NAMES utf8mb4;

-- Adicionar coluna itens_extras na tabela de pedidos
-- Armazena JSON: [{"descricao": "...", "valor": 00.00}, ...]
ALTER TABLE pedidos ADD COLUMN itens_extras TEXT AFTER observacoes_internas;
