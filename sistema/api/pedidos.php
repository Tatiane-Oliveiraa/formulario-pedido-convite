<?php
require_once __DIR__ . '/config.php';

$pdo = getConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Campos que precisam de NULL em vez de string vazia
$nullableFields = [
    'data_evento', 'hora_evento', 'data_fechamento', 'data_entrega',
    'data_repostagem', 'subtotal', 'valor_total', 'valor_sinal', 'valor_restante',
    'link_canva', 'link_convite', 'cliente_id'
];

/**
 * Limpa o valor de um campo: converte strings vazias em null
 * e trata booleanos para campos específicos.
 */
function cleanValue($field, $value) {
    global $nullableFields;

    // Converter strings vazias em null para campos de data/hora/numéricos
    if (in_array($field, $nullableFields) && ($value === '' || $value === null)) {
        return null;
    }

    // Converter booleanos para 0/1
    if ($field === 'aceite_termos' || $field === 'precisa_repostar') {
        return $value ? 1 : 0;
    }

    return $value;
}

function formatPedido($row) {
    if (!$row) return null;
    $pedido = $row;
    $pedido['cliente'] = [
        'nome'     => $row['cliente_nome']     ?? null,
        'cpf'      => $row['cliente_cpf']      ?? null,
        'telefone' => $row['cliente_telefone'] ?? null
    ];
    unset($pedido['cliente_nome'], $pedido['cliente_cpf'], $pedido['cliente_telefone']);
    
    if (isset($pedido['aceite_termos'])) {
        $pedido['aceite_termos'] = (bool)$pedido['aceite_termos'];
    }
    if (isset($pedido['precisa_repostar'])) {
        $pedido['precisa_repostar'] = (bool)$pedido['precisa_repostar'];
    }
    return $pedido;
}

$baseSelect = 'SELECT p.*, c.nome AS cliente_nome, c.cpf AS cliente_cpf, c.telefone AS cliente_telefone FROM pedidos p LEFT JOIN clientes c ON p.cliente_id = c.id';

try {

if ($method === 'GET') {
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare($baseSelect . ' WHERE p.id = :id');
        $stmt->execute(['id' => $_GET['id']]);
        $row = $stmt->fetch();
        jsonResponse($row ? formatPedido($row) : null);
    } elseif (isset($_GET['cliente_id'])) {
        $stmt = $pdo->prepare($baseSelect . ' WHERE p.cliente_id = :cliente_id ORDER BY p.created_at DESC');
        $stmt->execute(['cliente_id' => $_GET['cliente_id']]);
        $rows = $stmt->fetchAll();
        jsonResponse(array_map('formatPedido', $rows));
    } elseif (isset($_GET['status'])) {
        $stmt = $pdo->prepare($baseSelect . ' WHERE p.status = :status ORDER BY p.created_at DESC');
        $stmt->execute(['status' => $_GET['status']]);
        $rows = $stmt->fetchAll();
        jsonResponse(array_map('formatPedido', $rows));
    } elseif (isset($_GET['upcoming']) && $_GET['upcoming'] == '1') {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 5;
        $stmt = $pdo->prepare($baseSelect . " WHERE p.data_evento >= CURRENT_DATE AND p.status != 'Cancelado' ORDER BY p.data_evento ASC LIMIT " . $limit);
        $stmt->execute();
        $rows = $stmt->fetchAll();
        jsonResponse(array_map('formatPedido', $rows));
    } elseif (isset($_GET['repost']) && $_GET['repost'] == '1') {
        $stmt = $pdo->query($baseSelect . ' WHERE p.precisa_repostar = 1 ORDER BY p.data_repostagem ASC');
        $rows = $stmt->fetchAll();
        jsonResponse(array_map('formatPedido', $rows));
    } elseif (isset($_GET['count_new']) && $_GET['count_new'] == '1') {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM pedidos WHERE status = 'Novo'");
        $row = $stmt->fetch();
        jsonResponse(['count' => (int)$row['count']]);
    } else {
        $stmt = $pdo->query($baseSelect . ' ORDER BY p.created_at DESC');
        $rows = $stmt->fetchAll();
        jsonResponse(array_map('formatPedido', $rows));
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        jsonError("Corpo JSON inválido");
    }

    $id = generateUUID();
    
    $allowedFields = [
        'nome_aniversariante', 'data_evento', 'hora_evento', 'local_evento', 'tema_festa',
        'trilha_sonora', 'dress_code', 'paleta_cores', 'cores_convite', 'confirmacao_presenca',
        'whatsapp_confirmacao', 'mensagem_confirmacao', 'sugestoes_presente', 'chave_pix',
        'manual_convidado', 'outros_detalhes', 'observacoes', 'modelo',
        'botoes_interativos', 'complementos', 'album_fotos', 'forma_pagamento', 'subtotal',
        'valor_total', 'aceite_termos', 'texto_termos', 'status', 'valor_sinal', 'valor_restante',
        'data_fechamento', 'data_entrega', 'link_canva', 'link_convite', 'precisa_repostar',
        'data_repostagem', 'observacoes_internas', 'itens_extras', 'cliente_id'
    ];

    $fields = ['id'];
    $placeholders = [':id'];
    $params = ['id' => $id];

    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $data)) {
            $value = cleanValue($field, $data[$field]);

            $fields[] = $field;
            $placeholders[] = ':' . $field;
            $params[$field] = $value;
        }
    }

    $sql = 'INSERT INTO pedidos (' . implode(', ', $fields) . ') VALUES (' . implode(', ', $placeholders) . ')';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $stmt = $pdo->prepare($baseSelect . ' WHERE p.id = :id');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    jsonResponse($row ? formatPedido($row) : null, 201);
} elseif ($method === 'PUT') {
    if (!isset($_GET['id'])) {
        jsonError("ID não fornecido", 400);
    }
    $id = $_GET['id'];
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        jsonError("Corpo JSON inválido");
    }

    $allowedFields = [
        'nome_aniversariante', 'data_evento', 'hora_evento', 'local_evento', 'tema_festa',
        'trilha_sonora', 'dress_code', 'paleta_cores', 'cores_convite', 'confirmacao_presenca',
        'whatsapp_confirmacao', 'mensagem_confirmacao', 'sugestoes_presente', 'chave_pix',
        'manual_convidado', 'outros_detalhes', 'observacoes', 'modelo',
        'botoes_interativos', 'complementos', 'album_fotos', 'forma_pagamento', 'subtotal',
        'valor_total', 'aceite_termos', 'texto_termos', 'status', 'valor_sinal', 'valor_restante',
        'data_fechamento', 'data_entrega', 'link_canva', 'link_convite', 'precisa_repostar',
        'data_repostagem', 'observacoes_internas', 'itens_extras', 'cliente_id'
    ];

    $setClauses = [];
    $params = ['id' => $id];

    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $data)) {
            $value = cleanValue($field, $data[$field]);
            $setClauses[] = $field . ' = :' . $field;
            $params[$field] = $value;
        }
    }

    if (empty($setClauses)) {
        jsonError("Nenhum campo para atualizar fornecido");
    }

    $sql = 'UPDATE pedidos SET ' . implode(', ', $setClauses) . ' WHERE id = :id';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $stmt = $pdo->prepare($baseSelect . ' WHERE p.id = :id');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    jsonResponse($row ? formatPedido($row) : null);
} elseif ($method === 'DELETE') {
    if (!isset($_GET['id'])) {
        jsonError("ID não fornecido", 400);
    }
    $id = $_GET['id'];
    
    // Primeiro, exclui todas as movimentações financeiras atreladas a este pedido
    $stmtFin = $pdo->prepare('DELETE FROM financeiro WHERE pedido_id = :id');
    $stmtFin->execute(['id' => $id]);

    // Depois, exclui o pedido
    $stmt = $pdo->prepare('DELETE FROM pedidos WHERE id = :id');
    $stmt->execute(['id' => $id]);
    jsonResponse(['success' => true]);
} else {
    jsonError("Método não permitido", 405);
}

} catch (PDOException $e) {
    jsonError("Erro no banco de dados: " . $e->getMessage(), 500);
} catch (Exception $e) {
    jsonError("Erro interno: " . $e->getMessage(), 500);
}
?>
