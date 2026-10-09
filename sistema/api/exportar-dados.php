<?php
/**
 * Raíz & Pixel — Exportador de Dados (MySQL → JSON)
 * 
 * Use este script para migrar os dados da Hostinger para o sistema local.
 * 
 * Como usar:
 *   1. Envie este arquivo para a Hostinger (pasta sistema/api/)
 *   2. Acesse pelo navegador: https://[seu-site]/sistema/api/exportar-dados.php
 *   3. O download do JSON vai começar automaticamente
 *   4. No sistema local, clique em "📂 Restaurar" e selecione o arquivo
 */

require_once __DIR__ . '/config.php';

// ── Verificação de segurança básica ────────────────────────────
// Acesse com ?confirmar=sim para exportar
if (!isset($_GET['confirmar']) || $_GET['confirmar'] !== 'sim') {
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="pt-BR"><head>
    <meta charset="UTF-8">
    <title>Exportar Dados — Raíz & Pixel</title>
    <style>
        body { font-family: Arial, sans-serif; background: #1a1a2e; color: #e0e0e0;
               display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
        .box { background: #16213e; padding: 40px; border-radius: 12px;
               max-width: 480px; text-align: center; border: 1px solid #9b59b6; }
        h2 { color: #9b59b6; margin-top:0; }
        p  { color: #aaa; line-height: 1.6; }
        a  { display:inline-block; margin-top:20px; padding: 12px 32px;
             background: #9b59b6; color:#fff; text-decoration:none;
             border-radius: 8px; font-weight: bold; }
        a:hover { background: #6c3483; }
        .aviso { background: #2d1a1a; border: 1px solid #c0392b;
                 color: #e74c3c; padding: 12px; border-radius: 8px;
                 margin-top: 16px; font-size: 0.85rem; }
    </style>
    </head><body>
    <div class="box">
        <h2>📦 Exportar Dados</h2>
        <p>Este script vai baixar <strong>todos os seus dados</strong> do banco de dados
        em formato JSON para importar no sistema local.</p>
        <p>Clientes, pedidos, financeiro e produtos serão incluídos.</p>
        <div class="aviso">⚠️ Após a migração, delete este arquivo da Hostinger por segurança.</div>
        <a href="?confirmar=sim">⬇️ Baixar meus dados agora</a>
    </div>
    </body></html>';
    exit();
}

// ── Conectar ao banco e exportar ───────────────────────────────
try {
    $pdo = getConnection();

    // Clientes
    $clientes = $pdo->query('SELECT * FROM clientes ORDER BY nome ASC')->fetchAll(PDO::FETCH_ASSOC);

    // Pedidos
    $pedidos = $pdo->query('SELECT * FROM pedidos ORDER BY created_at DESC')->fetchAll(PDO::FETCH_ASSOC);

    // Converter tipos numéricos dos pedidos
    foreach ($pedidos as &$p) {
        foreach (['subtotal','valor_total','valor_sinal','valor_restante'] as $campo) {
            if (isset($p[$campo])) $p[$campo] = (float)$p[$campo];
        }
        if (isset($p['precisa_repostar'])) $p['precisa_repostar'] = (bool)$p['precisa_repostar'];
    }
    unset($p);

    // Financeiro
    $financeiro = $pdo->query('SELECT * FROM financeiro ORDER BY data DESC')->fetchAll(PDO::FETCH_ASSOC);
    foreach ($financeiro as &$f) {
        if (isset($f['valor'])) $f['valor'] = (float)$f['valor'];
    }
    unset($f);

    // Produtos (tabela pode não existir ainda)
    $produtos = [];
    try {
        $produtos = $pdo->query('SELECT * FROM produtos ORDER BY categoria ASC, preco ASC')->fetchAll(PDO::FETCH_ASSOC);
        foreach ($produtos as &$pr) {
            if (isset($pr['preco'])) $pr['preco'] = (float)$pr['preco'];
            if (isset($pr['ativo'])) $pr['ativo'] = (int)$pr['ativo'];
        }
        unset($pr);
    } catch (Exception $e) {
        // Tabela produtos pode não existir — sem problema
    }

    // Montar JSON de exportação
    $export = [
        'exportado_em' => date('c'),
        'versao'       => '1.0',
        'origem'       => 'Hostinger/MySQL',
        'totais'       => [
            'clientes'   => count($clientes),
            'pedidos'    => count($pedidos),
            'financeiro' => count($financeiro),
            'produtos'   => count($produtos),
        ],
        'clientes'     => $clientes,
        'pedidos'      => $pedidos,
        'financeiro'   => $financeiro,
        'produtos'     => $produtos,
    ];

    // Forçar download do arquivo JSON
    $filename = 'raiz-pixel-backup-hostinger-' . date('Y-m-d') . '.json';
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: no-cache');

    echo json_encode($export, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Erro ao exportar: ' . $e->getMessage()]);
}
?>
