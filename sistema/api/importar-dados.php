<?php
/**
 * Raíz & Pixel — Importador Robusto de Backup
 *
 * Aceita o JSON exportado pelo exportar-dados.php (Hostinger ou sistema atual)
 * e importa os dados de forma segura:
 *   • Usa INSERT IGNORE (MySQL) para pular registros já existentes
 *   • Importa na ordem correta: clientes → produtos → pedidos → financeiro
 *   • Trata CPF vazio gerando um placeholder único
 *   • Remove campos inexistentes na tabela atual (compatibilidade)
 *   • Retorna relatório detalhado por tabela
 */

require_once __DIR__ . '/config.php';

// Só aceita POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Método não permitido', 405);
}

$raw = file_get_contents('php://input');
$dados = json_decode($raw, true);

if (!$dados || (!isset($dados['clientes']) && !isset($dados['pedidos']))) {
    jsonError('Arquivo JSON inválido ou estrutura não reconhecida.', 400);
}

$pdo = getConnection();
$isMySQL = (DB_DRIVER === 'mysql');

// Desabilitar checagem de FK temporariamente para importação
if ($isMySQL) {
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
}

$relatorio = [
    'clientes'   => ['ok' => 0, 'pulados' => 0, 'erros' => []],
    'produtos'   => ['ok' => 0, 'pulados' => 0, 'erros' => []],
    'pedidos'    => ['ok' => 0, 'pulados' => 0, 'erros' => []],
    'financeiro' => ['ok' => 0, 'pulados' => 0, 'erros' => []],
];

// ─────────────────────────────────────────────────────────────────
// Descobre quais colunas realmente existem em cada tabela
// ─────────────────────────────────────────────────────────────────
function getTableColumns($pdo, $tabela) {
    try {
        if (DB_DRIVER === 'pgsql') {
            $stmt = $pdo->prepare("SELECT column_name FROM information_schema.columns WHERE table_name = ?");
        } else {
            $stmt = $pdo->prepare("SHOW COLUMNS FROM `$tabela`");
        }
        $stmt->execute(DB_DRIVER === 'pgsql' ? [$tabela] : []);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (DB_DRIVER === 'pgsql') {
            return array_column($rows, 'column_name');
        } else {
            return array_column($rows, 'Field');
        }
    } catch (Exception $e) {
        return [];
    }
}

$colsClientes   = getTableColumns($pdo, 'clientes');
$colsPedidos    = getTableColumns($pdo, 'pedidos');
$colsFinanceiro = getTableColumns($pdo, 'financeiro');
$colsProdutos   = getTableColumns($pdo, 'produtos');

// ─────────────────────────────────────────────────────────────────
// Helper: filtra o registro para conter só colunas válidas,
//         gera um id se faltar, e trata CPF vazio
// ─────────────────────────────────────────────────────────────────
function prepararRegistro($registro, $colunas, $tabela = '') {
    // Garantir que tem ID
    if (empty($registro['id'])) {
        $registro['id'] = generateUUID();
    }

    // Tratar CPF vazio/nulo em clientes (coluna UNIQUE NOT NULL)
    if ($tabela === 'clientes') {
        if (empty($registro['cpf'])) {
            // Gera um CPF-placeholder único baseado no ID para não violar UNIQUE
            $registro['cpf'] = 'SEM_CPF_' . substr(str_replace('-', '', $registro['id']), 0, 11);
        }
        // Limpar CPF: só dígitos (ou o placeholder)
        if (!str_starts_with($registro['cpf'], 'SEM_CPF_')) {
            $registro['cpf'] = preg_replace('/[^0-9]/', '', $registro['cpf']);
        }
    }

    // Remover campos que não existem na tabela atual (compatibilidade versão antiga)
    $filtrado = [];
    foreach ($colunas as $col) {
        if ($col === 'created_at') continue; // deixa o DEFAULT do banco
        if (array_key_exists($col, $registro)) {
            $filtrado[$col] = $registro[$col];
        }
    }
    // Sempre inclui o id
    $filtrado['id'] = $registro['id'];

    return $filtrado;
}

// ─────────────────────────────────────────────────────────────────
// Helper: monta e executa INSERT IGNORE (MySQL) ou INSERT … ON CONFLICT DO NOTHING (PgSQL)
// ─────────────────────────────────────────────────────────────────
function importarRegistro($pdo, $tabela, $dados, &$secao) {
    if (empty($dados)) { $secao['pulados']++; return; }

    $campos      = array_keys($dados);
    $colsStr     = implode(', ', array_map(fn($c) => "`$c`", $campos));
    $placeholders = implode(', ', array_map(fn($c) => ":$c", $campos));

    if (DB_DRIVER === 'pgsql') {
        $sql = "INSERT INTO $tabela ($colsStr) VALUES ($placeholders) ON CONFLICT (id) DO NOTHING";
        $colsStr = implode(', ', $campos); // sem backticks no pgsql
        $sql = "INSERT INTO $tabela ($colsStr) VALUES ($placeholders) ON CONFLICT (id) DO NOTHING";
    } else {
        $colsStr = implode(', ', array_map(fn($c) => "`$c`", $campos));
        $sql = "INSERT IGNORE INTO `$tabela` ($colsStr) VALUES ($placeholders)";
    }

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($dados);
        $affected = $stmt->rowCount();
        if ($affected > 0) {
            $secao['ok']++;
        } else {
            $secao['pulados']++; // já existia
        }
    } catch (PDOException $e) {
        $secao['pulados']++;
        // Só registra erros que não são de chave duplicada
        $code = $e->getCode();
        if ($code != 23000 && $code != '23000') {
            $secao['erros'][] = "ID {$dados['id']}: " . $e->getMessage();
        }
    }
}

// ─────────────────────────────────────────────────────────────────
// 1. CLIENTES
// ─────────────────────────────────────────────────────────────────
foreach (($dados['clientes'] ?? []) as $c) {
    $reg = prepararRegistro($c, $colsClientes, 'clientes');
    importarRegistro($pdo, 'clientes', $reg, $relatorio['clientes']);
}

// ─────────────────────────────────────────────────────────────────
// 2. PRODUTOS
// ─────────────────────────────────────────────────────────────────
if (!empty($colsProdutos)) {
    foreach (($dados['produtos'] ?? []) as $p) {
        // Pular produtos "inativos" marcados como ativo=0 no backup
        // (serão importados para preservar histórico em pedidos)
        $reg = prepararRegistro($p, $colsProdutos);
        importarRegistro($pdo, 'produtos', $reg, $relatorio['produtos']);
    }
}

// ─────────────────────────────────────────────────────────────────
// 3. PEDIDOS
// ─────────────────────────────────────────────────────────────────
foreach (($dados['pedidos'] ?? []) as $p) {
    $reg = prepararRegistro($p, $colsPedidos);

    // Garantir status válido
    $statusValidos = ['Novo','Fechado','Em Produção','Aguardando Aprovação','Aprovado','Entregue','Cancelado'];
    if (!empty($reg['status']) && !in_array($reg['status'], $statusValidos)) {
        $reg['status'] = 'Novo';
    }
    if (empty($reg['status'])) {
        $reg['status'] = 'Novo';
    }

    importarRegistro($pdo, 'pedidos', $reg, $relatorio['pedidos']);
}

// ─────────────────────────────────────────────────────────────────
// 4. FINANCEIRO
// ─────────────────────────────────────────────────────────────────
foreach (($dados['financeiro'] ?? []) as $f) {
    $reg = prepararRegistro($f, $colsFinanceiro);
    importarRegistro($pdo, 'financeiro', $reg, $relatorio['financeiro']);
}

// Re-habilitar FK checks
if ($isMySQL) {
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
}

// ─────────────────────────────────────────────────────────────────
// Retornar relatório
// ─────────────────────────────────────────────────────────────────
$totalOk     = $relatorio['clientes']['ok'] + $relatorio['produtos']['ok']
             + $relatorio['pedidos']['ok']  + $relatorio['financeiro']['ok'];
$totalPulados = $relatorio['clientes']['pulados'] + $relatorio['produtos']['pulados']
              + $relatorio['pedidos']['pulados']   + $relatorio['financeiro']['pulados'];

jsonResponse([
    'sucesso'      => true,
    'total_ok'     => $totalOk,
    'total_pulados'=> $totalPulados,
    'relatorio'    => $relatorio,
]);
?>
