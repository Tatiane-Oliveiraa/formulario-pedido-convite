<?php
require_once __DIR__ . '/config.php';

$pdo = getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {

if ($method === 'GET') {
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare('SELECT * FROM produtos WHERE id = :id');
        $stmt->execute(['id' => $_GET['id']]);
        jsonResponse($stmt->fetch());
    } elseif (isset($_GET['categoria'])) {
        $stmt = $pdo->prepare('SELECT * FROM produtos WHERE categoria = :cat AND ativo = 1 ORDER BY subcategoria ASC, preco ASC');
        $stmt->execute(['cat' => $_GET['categoria']]);
        jsonResponse($stmt->fetchAll());
    } else {
        $stmt = $pdo->query('SELECT * FROM produtos WHERE ativo = 1 ORDER BY categoria ASC, subcategoria ASC, preco ASC');
        jsonResponse($stmt->fetchAll());
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data || empty($data['nome']) || !isset($data['preco']) || empty($data['categoria'])) {
        jsonError('Dados inválidos: nome, preco e categoria são obrigatórios');
    }
    // Usar ID do backup se fornecido, senão gerar novo UUID
    $id = !empty($data['id']) ? $data['id'] : generateUUID();
    $stmt = $pdo->prepare('
        INSERT INTO produtos (id, categoria, subcategoria, nome, preco, observacao)
        VALUES (:id, :categoria, :subcategoria, :nome, :preco, :observacao)
    ');
    $stmt->execute([
        'id'           => $id,
        'categoria'    => $data['categoria'],
        'subcategoria' => $data['subcategoria'] ?? null,
        'nome'         => $data['nome'],
        'preco'        => (float)$data['preco'],
        'observacao'   => $data['observacao'] ?? null
    ]);
    $stmt = $pdo->prepare('SELECT * FROM produtos WHERE id = :id');
    $stmt->execute(['id' => $id]);
    jsonResponse($stmt->fetch(), 201);
} elseif ($method === 'PUT') {
    if (!isset($_GET['id'])) jsonError('ID não fornecido', 400);
    $id = $_GET['id'];
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) jsonError('Corpo JSON inválido');

    $setClauses = [];
    $params = ['id' => $id];
    $allowed = ['categoria', 'subcategoria', 'nome', 'preco', 'observacao', 'ativo'];
    foreach ($allowed as $field) {
        if (array_key_exists($field, $data)) {
            $setClauses[] = "$field = :$field";
            $params[$field] = ($field === 'preco') ? (float)$data[$field] : $data[$field];
        }
    }
    if (empty($setClauses)) jsonError('Nenhum campo para atualizar');
    $pdo->prepare('UPDATE produtos SET ' . implode(', ', $setClauses) . ' WHERE id = :id')->execute($params);
    $stmt = $pdo->prepare('SELECT * FROM produtos WHERE id = :id');
    $stmt->execute(['id' => $id]);
    jsonResponse($stmt->fetch());
} elseif ($method === 'DELETE') {
    if (!isset($_GET['id'])) jsonError('ID não fornecido', 400);
    // Soft delete (ativo = 0) para preservar histórico em pedidos
    $pdo->prepare('UPDATE produtos SET ativo = 0 WHERE id = :id')->execute(['id' => $_GET['id']]);
    jsonResponse(['success' => true]);
} else {
    jsonError('Método não permitido', 405);
}

} catch (PDOException $e) {
    jsonError('Erro no banco de dados: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    jsonError('Erro interno: ' . $e->getMessage(), 500);
}
?>
