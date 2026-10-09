<?php
/**
 * Raíz & Pixel — Importador de Backup v3
 * Estratégia: importa sem precisar desabilitar FK no PostgreSQL
 * - Clientes primeiro (com CPF tratado)
 * - Pedidos com cliente_id = NULL se cliente não existir
 * - Financeiro com pedido_id = NULL se pedido não existir
 * - Todos os erros são reportados, nunca interrompem o processo
 */

require_once __DIR__ . '/config.php';

// Importação envolve centenas de INSERTs remotos: evita estourar o limite de 30s do PHP
// e continua mesmo se o navegador desconectar.
@set_time_limit(0);
@ignore_user_abort(true);
@ini_set('memory_limit', '256M');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { jsonError('Método não permitido', 405); }

$raw = file_get_contents('php://input');
if (!$raw) { jsonError('Nenhum dado recebido.', 400); }

$dados = json_decode($raw, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    jsonError('JSON inválido: ' . json_last_error_msg(), 400);
}
if (!isset($dados['clientes']) && !isset($dados['pedidos'])) {
    jsonError('Estrutura do backup não reconhecida.', 400);
}

try { $pdo = getConnection(); }
catch (Exception $e) { jsonError('Erro de conexão: ' . $e->getMessage(), 500); }

$isPgsql = (DB_DRIVER === 'pgsql');

// ── Relatório ──────────────────────────────────────────────────
$rel = [
    'clientes'   => ['ok' => 0, 'pulados' => 0, 'erros' => []],
    'produtos'   => ['ok' => 0, 'pulados' => 0, 'erros' => []],
    'pedidos'    => ['ok' => 0, 'pulados' => 0, 'erros' => []],
    'financeiro' => ['ok' => 0, 'pulados' => 0, 'erros' => []],
];

// ── Colunas reais de cada tabela ───────────────────────────────
function colunas($pdo, $tabela) {
    try {
        if (DB_DRIVER === 'pgsql') {
            $r = $pdo->prepare(
                "SELECT column_name FROM information_schema.columns
                 WHERE table_schema='public' AND table_name=:t ORDER BY ordinal_position"
            );
            $r->execute([':t' => $tabela]);
            return array_column($r->fetchAll(PDO::FETCH_ASSOC), 'column_name');
        } else {
            $r = $pdo->query("SHOW COLUMNS FROM `{$tabela}`");
            return array_column($r->fetchAll(PDO::FETCH_ASSOC), 'Field');
        }
    } catch (Exception $e) { return []; }
}

// ── Conjunto de IDs que foram importados com sucesso ───────────
$idsClientesImportados = [];
$idsPedidosImportados  = [];

// ── Inserção de um registro ────────────────────────────────────
function inserir($pdo, $tabela, $dados, &$secao, $isPgsql) {
    if (empty($dados['id'])) { $secao['pulados']++; return false; }

    $campos = array_keys($dados);
    $params = implode(', ', array_map(fn($c) => ":{$c}", $campos));

    if ($isPgsql) {
        $cols = implode(', ', $campos);
        $sql  = "INSERT INTO {$tabela} ({$cols}) VALUES ({$params}) ON CONFLICT (id) DO NOTHING";
    } else {
        $cols = implode(', ', array_map(fn($c) => "`{$c}`", $campos));
        $sql  = "INSERT IGNORE INTO `{$tabela}` ({$cols}) VALUES ({$params})";
    }

    try {
        $stmt = $pdo->prepare($sql);
        foreach ($dados as $col => $val) {
            if (is_null($val)) {
                $stmt->bindValue(":{$col}", null, PDO::PARAM_NULL);
            } elseif (is_bool($val)) {
                $stmt->bindValue(":{$col}", (int)$val, PDO::PARAM_INT);
            } else {
                $stmt->bindValue(":{$col}", $val);
            }
        }
        $stmt->execute();
        if ($stmt->rowCount() > 0) {
            $secao['ok']++;
            return true;
        } else {
            $secao['pulados']++; // já existia
            return true; // considera sucesso (já estava lá)
        }
    } catch (PDOException $e) {
        $code = (string)$e->getCode();
        // 23505 = unique violation (pgsql) | 23000 = constraint (mysql)
        // Nestes casos o registro já existe → pular silenciosamente
        if (in_array($code, ['23000', '23505'])) {
            $secao['pulados']++;
            return true;
        }
        // Outros erros: registrar mas não parar
        $secao['pulados']++;
        $secao['erros'][] = "[{$tabela}] {$dados['id']}: " . $e->getMessage();
        return false;
    }
}

// ── Buscar colunas ─────────────────────────────────────────────
$colsC = colunas($pdo, 'clientes');
$colsP = colunas($pdo, 'pedidos');
$colsF = colunas($pdo, 'financeiro');
$colsR = colunas($pdo, 'produtos');

// ── Monta registro filtrando só colunas existentes ─────────────
function montar($src, $cols, $tabela = '') {
    if (!is_array($src)) return null;

    $id = $src['id'] ?? generateUUID();
    $reg = ['id' => $id];

    foreach ($cols as $col) {
        if ($col === 'id' || $col === 'created_at' || $col === 'updated_at') continue;
        if (!array_key_exists($col, $src)) continue;
        $v = $src[$col];
        // Converter string vazia para null
        if ($v === '' || $v === 'null') $v = null;
        // Converter booleanos
        if (is_bool($v)) $v = (int)$v;
        $reg[$col] = $v;
    }

    // Correções por tabela
    if ($tabela === 'clientes') {
        $cpf = preg_replace('/[^0-9]/', '', (string)($reg['cpf'] ?? ''));
        if (empty($cpf)) {
            $cpf = 'SEMCPF' . strtoupper(substr(str_replace('-', '', $id), 0, 11));
        }
        $reg['cpf'] = $cpf;
        if (empty($reg['nome'])) $reg['nome'] = 'Cliente sem nome';
    }

    if ($tabela === 'pedidos') {
        $validos = ['Novo','Fechado','Em Produção','Aguardando Aprovação','Aprovado','Entregue','Cancelado'];
        if (empty($reg['status']) || !in_array($reg['status'], $validos)) {
            $reg['status'] = 'Novo';
        }
    }

    return $reg;
}

// ════════════════════════════════════════════════════════════════
// 1. CLIENTES
// ════════════════════════════════════════════════════════════════
foreach (($dados['clientes'] ?? []) as $src) {
    $reg = montar($src, $colsC, 'clientes');
    if (!$reg) { $rel['clientes']['pulados']++; continue; }
    $ok = inserir($pdo, 'clientes', $reg, $rel['clientes'], $isPgsql);
    if ($ok) $idsClientesImportados[$reg['id']] = true;
}

// ════════════════════════════════════════════════════════════════
// 2. PRODUTOS
// ════════════════════════════════════════════════════════════════
if (!empty($colsR)) {
    foreach (($dados['produtos'] ?? []) as $src) {
        $reg = montar($src, $colsR);
        if (!$reg) { $rel['produtos']['pulados']++; continue; }
        inserir($pdo, 'produtos', $reg, $rel['produtos'], $isPgsql);
    }
}

// ════════════════════════════════════════════════════════════════
// 3. PEDIDOS — resolve FK: se cliente não existe, seta NULL
// ════════════════════════════════════════════════════════════════
// Busca IDs de clientes já existentes no banco
$clientesNoBanco = [];
try {
    $rows = $pdo->query('SELECT id FROM clientes')->fetchAll(PDO::FETCH_COLUMN);
    foreach ($rows as $cid) $clientesNoBanco[$cid] = true;
} catch (Exception $e) {}

foreach (($dados['pedidos'] ?? []) as $src) {
    $reg = montar($src, $colsP, 'pedidos');
    if (!$reg) { $rel['pedidos']['pulados']++; continue; }

    // FK: se cliente_id não existe no banco → NULL (evita erro de FK)
    if (!empty($reg['cliente_id'])) {
        if (!isset($clientesNoBanco[$reg['cliente_id']]) &&
            !isset($idsClientesImportados[$reg['cliente_id']])) {
            $reg['cliente_id'] = null;
        }
    }

    $ok = inserir($pdo, 'pedidos', $reg, $rel['pedidos'], $isPgsql);
    if ($ok) $idsPedidosImportados[$reg['id']] = true;
}

// ════════════════════════════════════════════════════════════════
// 4. FINANCEIRO — resolve FK: se pedido não existe, seta NULL
// ════════════════════════════════════════════════════════════════
$pedidosNoBanco = [];
try {
    $rows = $pdo->query('SELECT id FROM pedidos')->fetchAll(PDO::FETCH_COLUMN);
    foreach ($rows as $pid) $pedidosNoBanco[$pid] = true;
} catch (Exception $e) {}

foreach (($dados['financeiro'] ?? []) as $src) {
    $reg = montar($src, $colsF);
    if (!$reg) { $rel['financeiro']['pulados']++; continue; }

    // FK: se pedido_id não existe → NULL
    if (!empty($reg['pedido_id'])) {
        if (!isset($pedidosNoBanco[$reg['pedido_id']]) &&
            !isset($idsPedidosImportados[$reg['pedido_id']])) {
            $reg['pedido_id'] = null;
        }
    }

    inserir($pdo, 'financeiro', $reg, $rel['financeiro'], $isPgsql);
}

// ── Totais ─────────────────────────────────────────────────────
$totalOk     = array_sum(array_column($rel, 'ok'));
$totalPulados = array_sum(array_column($rel, 'pulados'));

jsonResponse([
    'sucesso'       => true,
    'total_ok'      => $totalOk,
    'total_pulados' => $totalPulados,
    'relatorio'     => $rel,
]);
?>
