<?php
require_once __DIR__ . '/config.php';

$pdo = getConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Campos que precisam de NULL em vez de string vazia
$nullableFields = ['data', 'pedido_id', 'valor'];

/**
 * Limpa o valor: converte strings vazias em null para campos nuláveis.
 */
function cleanFinValue($field, $value) {
    global $nullableFields;
    if (in_array($field, $nullableFields) && ($value === '' || $value === null)) {
        return null;
    }
    return $value;
}

try {

if ($method === 'GET') {
    if (isset($_GET['summary']) && $_GET['summary'] == '1' && isset($_GET['year']) && isset($_GET['month'])) {
        $year = (int)$_GET['year'];
        $month = str_pad((int)$_GET['month'], 2, '0', STR_PAD_LEFT);
        
        $startDate = "$year-$month-01";
        $nextMonth = ((int)$_GET['month'] == 12) ? 1 : (int)$_GET['month'] + 1;
        $nextYear = ((int)$_GET['month'] == 12) ? $year + 1 : $year;
        $nextMonthPadded = str_pad($nextMonth, 2, '0', STR_PAD_LEFT);
        $endDate = "$nextYear-$nextMonthPadded-01";

        $stmt = $pdo->prepare('SELECT * FROM financeiro WHERE data >= :start AND data < :end ORDER BY data DESC');
        $stmt->execute(['start' => $startDate, 'end' => $endDate]);
        $items = $stmt->fetchAll();

        $entradas = 0;
        $saidas = 0;
        foreach ($items as $item) {
            if ($item['tipo'] === 'entrada') {
                $entradas += (float)$item['valor'];
            } else {
                $saidas += (float)$item['valor'];
            }
        }
        $saldo = $entradas - $saidas;

        jsonResponse([
            'entradas' => $entradas,
            'saidas' => $saidas,
            'saldo' => $saldo,
            'items' => $items
        ]);
    } elseif (isset($_GET['year']) && isset($_GET['month'])) {
        $year = (int)$_GET['year'];
        $month = str_pad((int)$_GET['month'], 2, '0', STR_PAD_LEFT);
        
        $startDate = "$year-$month-01";
        $nextMonth = ((int)$_GET['month'] == 12) ? 1 : (int)$_GET['month'] + 1;
        $nextYear = ((int)$_GET['month'] == 12) ? $year + 1 : $year;
        $nextMonthPadded = str_pad($nextMonth, 2, '0', STR_PAD_LEFT);
        $endDate = "$nextYear-$nextMonthPadded-01";

        $stmt = $pdo->prepare('SELECT * FROM financeiro WHERE data >= :start AND data < :end ORDER BY data DESC');
        $stmt->execute(['start' => $startDate, 'end' => $endDate]);
        jsonResponse($stmt->fetchAll());
    } elseif (isset($_GET['date'])) {
        $stmt = $pdo->prepare('SELECT * FROM financeiro WHERE data = :date ORDER BY created_at DESC');
        $stmt->execute(['date' => $_GET['date']]);
        jsonResponse($stmt->fetchAll());
    } else {
        $stmt = $pdo->query('SELECT * FROM financeiro ORDER BY data DESC');
        jsonResponse($stmt->fetchAll());
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        jsonError("Corpo JSON inválido");
    }

    // Usar ID do backup se fornecido, senão gerar novo UUID
    $id = !empty($data['id']) ? $data['id'] : generateUUID();
    
    $allowedFields = ['tipo', 'descricao', 'valor', 'data', 'pedido_id', 'categoria'];
    $fields = ['id'];
    $placeholders = [':id'];
    $params = ['id' => $id];

    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $data)) {
            $value = cleanFinValue($field, $data[$field]);
            
            // Pular se null e é campo anulável
            if ($value === null && in_array($field, $nullableFields)) {
                continue;
            }

            $fields[] = $field;
            $placeholders[] = ':' . $field;
            $params[$field] = $value;
        }
    }

    $sql = 'INSERT INTO financeiro (' . implode(', ', $fields) . ') VALUES (' . implode(', ', $placeholders) . ')';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $stmt = $pdo->prepare('SELECT * FROM financeiro WHERE id = :id');
    $stmt->execute(['id' => $id]);
    jsonResponse($stmt->fetch(), 201);
} elseif ($method === 'DELETE') {
    if (!isset($_GET['id'])) {
        jsonError("ID não fornecido", 400);
    }
    $id = $_GET['id'];
    $stmt = $pdo->prepare('DELETE FROM financeiro WHERE id = :id');
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
