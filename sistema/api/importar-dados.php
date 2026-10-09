<?php
/**
 * Raíz & Pixel — Importador Robusto de Backup v2
 * Compatível com PHP 8.0+, MySQL e PostgreSQL (Supabase/Render)
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Método não permitido', 405);
}

$raw = file_get_contents('php://input');
if (!$raw) {
    jsonError('Nenhum dado recebido. Verifique se o arquivo foi enviado corretamente.', 400);
}

$dados = json_decode($raw, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    jsonError('Arquivo JSON inválido: ' . json_last_error_msg(), 400);
}

if (!isset($dados['clientes']) && !isset($dados['pedidos'])) {
    jsonError('Estrutura do backup não reconhecida. Certifique-se de usar o arquivo JSON exportado pelo sistema.', 400);
}

// ── Conectar ──────────────────────────────────────────────────
try {
    $pdo = getConnection();
} catch (Exception $e) {
    jsonError('Erro de conexão com banco: ' . $e->getMessage(), 500);
}

$isMySQL = (DB_DRIVER !== 'pgsql');

// ── Desabilitar FK temporariamente ───────────────────────────
if ($isMySQL) {
    try { $pdo->exec('SET FOREIGN_KEY_CHECKS = 0'); } catch (Exception $e) {}
} else {
    try { $pdo->exec('SET session_replication_role = replica'); } catch (Exception $e) {}
}

// ── Relatório ─────────────────────────────────────────────────
$rel = [
    'clientes'   => ['ok' => 0, 'pulados' => 0, 'erros' => []],
    'produtos'   => ['ok' => 0, 'pulados' => 0, 'erros' => []],
    'pedidos'    => ['ok' => 0, 'pulados' => 0, 'erros' => []],
    'financeiro' => ['ok' => 0, 'pulados' => 0, 'erros' => []],
];

// ── Busca colunas reais de uma tabela ─────────────────────────
function obterColunas($pdo, $tabela) {
    try {
        if (DB_DRIVER === 'pgsql') {
            $stmt = $pdo->prepare(
                "SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = :t"
            );
            $stmt->execute([':t' => $tabela]);
            return array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'column_name');
        } else {
            $stmt = $pdo->query("SHOW COLUMNS FROM `{$tabela}`");
            return array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'Field');
        }
    } catch (Exception $e) {
        return [];
    }
}

// ── Normaliza um valor para o banco ──────────────────────────
function normalizar($valor) {
    if ($valor === '' || $valor === 'null') return null;
    return $valor;
}

// ── Filtra registro para conter só colunas existentes ────────
function filtrarRegistro($reg, $colunas, $tabela = '') {
    // Garantir ID
    if (empty($reg['id'])) {
        $reg['id'] = generateUUID();
    }

    // CPF: obrigatório e único em clientes
    if ($tabela === 'clientes') {
        $cpf = isset($reg['cpf']) ? preg_replace('/[^0-9]/', '', (string)$reg['cpf']) : '';
        if (empty($cpf)) {
            // Gera placeholder único baseado no ID
            $cpf = 'SEMCPF' . strtoupper(substr(str_replace('-', '', $reg['id']), 0, 11));
        }
        $reg['cpf'] = $cpf;
    }

    // Status válido em pedidos
    if ($tabela === 'pedidos') {
        $statusValidos = ['Novo','Fechado','Em Produção','Aguardando Aprovação','Aprovado','Entregue','Cancelado'];
        if (empty($reg['status']) || !in_array($reg['status'], $statusValidos)) {
            $reg['status'] = 'Novo';
        }
    }

    // Filtrar: só campos que existem na tabela, exceto created_at
    $filtrado = ['id' => $reg['id']];
    foreach ($colunas as $col) {
        if ($col === 'id' || $col === 'created_at') continue;
        if (array_key_exists($col, $reg)) {
            $filtrado[$col] = normalizar($reg[$col]);
        }
    }
    return $filtrado;
}

// ── Insere um registro ignorando duplicatas ───────────────────
function inserirRegistro($pdo, $tabela, $dados, &$secao, $isMySQL) {
    if (empty($dados) || empty($dados['id'])) {
        $secao['pulados']++;
        return;
    }

    $campos = array_keys($dados);

    if ($isMySQL) {
        $colsSQL = implode(', ', array_map(fn($c) => "`{$c}`", $campos));
        $params  = implode(', ', array_map(fn($c) => ":{$c}", $campos));
        $sql = "INSERT IGNORE INTO `{$tabela}` ({$colsSQL}) VALUES ({$params})";
    } else {
        $colsSQL = implode(', ', $campos);
        $params  = implode(', ', array_map(fn($c) => ":{$c}", $campos));
        $sql = "INSERT INTO {$tabela} ({$colsSQL}) VALUES ({$params}) ON CONFLICT (id) DO NOTHING";
    }

    try {
        $stmt = $pdo->prepare($sql);
        // Bind com tipos corretos
        foreach ($dados as $col => $val) {
            if (is_null($val)) {
                $stmt->bindValue(":{$col}", null, PDO::PARAM_NULL);
            } elseif (is_bool($val)) {
                $stmt->bindValue(":{$col}", $val ? 1 : 0, PDO::PARAM_INT);
            } elseif (is_int($val)) {
                $stmt->bindValue(":{$col}", $val, PDO::PARAM_INT);
            } elseif (is_float($val)) {
                $stmt->bindValue(":{$col}", $val);
            } else {
                $stmt->bindValue(":{$col}", (string)$val, PDO::PARAM_STR);
            }
        }
        $stmt->execute();
        $affected = $stmt->rowCount();
        if ($affected > 0) {
            $secao['ok']++;
        } else {
            $secao['pulados']++;
        }
    } catch (PDOException $e) {
        // Código 23000 = duplicate key — não é erro crítico
        $code = (string)$e->getCode();
        if ($code === '23000' || $code === '23505') {
            $secao['pulados']++;
        } else {
            $secao['pulados']++;
            $secao['erros'][] = "[{$tabela}] id={$dados['id']}: " . $e->getMessage();
        }
    }
}

// ── Buscar colunas de cada tabela ────────────────────────────
$colsClientes   = obterColunas($pdo, 'clientes');
$colsPedidos    = obterColunas($pdo, 'pedidos');
$colsFinanceiro = obterColunas($pdo, 'financeiro');
$colsProdutos   = obterColunas($pdo, 'produtos');

// ── 1. CLIENTES ───────────────────────────────────────────────
foreach (($dados['clientes'] ?? []) as $c) {
    if (!is_array($c)) continue;
    $reg = filtrarRegistro($c, $colsClientes, 'clientes');
    inserirRegistro($pdo, 'clientes', $reg, $rel['clientes'], $isMySQL);
}

// ── 2. PRODUTOS ───────────────────────────────────────────────
if (!empty($colsProdutos)) {
    foreach (($dados['produtos'] ?? []) as $p) {
        if (!is_array($p)) continue;
        $reg = filtrarRegistro($p, $colsProdutos);
        inserirRegistro($pdo, 'produtos', $reg, $rel['produtos'], $isMySQL);
    }
}

// ── 3. PEDIDOS ────────────────────────────────────────────────
foreach (($dados['pedidos'] ?? []) as $p) {
    if (!is_array($p)) continue;
    $reg = filtrarRegistro($p, $colsPedidos, 'pedidos');
    inserirRegistro($pdo, 'pedidos', $reg, $rel['pedidos'], $isMySQL);
}

// ── 4. FINANCEIRO ─────────────────────────────────────────────
foreach (($dados['financeiro'] ?? []) as $f) {
    if (!is_array($f)) continue;
    $reg = filtrarRegistro($f, $colsFinanceiro);
    inserirRegistro($pdo, 'financeiro', $reg, $rel['financeiro'], $isMySQL);
}

// ── Reabilitar FK ─────────────────────────────────────────────
if ($isMySQL) {
    try { $pdo->exec('SET FOREIGN_KEY_CHECKS = 1'); } catch (Exception $e) {}
} else {
    try { $pdo->exec('SET session_replication_role = DEFAULT'); } catch (Exception $e) {}
}

// ── Resposta ──────────────────────────────────────────────────
$totalOk     = $rel['clientes']['ok'] + $rel['produtos']['ok']
             + $rel['pedidos']['ok']  + $rel['financeiro']['ok'];
$totalPulados = $rel['clientes']['pulados'] + $rel['produtos']['pulados']
              + $rel['pedidos']['pulados']   + $rel['financeiro']['pulados'];

jsonResponse([
    'sucesso'       => true,
    'total_ok'      => $totalOk,
    'total_pulados' => $totalPulados,
    'relatorio'     => $rel,
]);
?>
