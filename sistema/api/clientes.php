<?php
require_once __DIR__ . '/config.php';

$pdo = getConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Helper para limpar CPF
function cleanCpf($cpf) {
    return preg_replace('/[^0-9]/', '', $cpf);
}

try {

    if ($method === 'GET') {
        if (isset($_GET['id'])) {
            $stmt = $pdo->prepare('SELECT * FROM clientes WHERE id = :id');
            $stmt->execute(['id' => $_GET['id']]);
            $cliente = $stmt->fetch();
            jsonResponse($cliente ?: null);
        } elseif (isset($_GET['cpf'])) {
            $cpf = cleanCpf($_GET['cpf']);
            $stmt = $pdo->prepare('SELECT * FROM clientes WHERE cpf = :cpf');
            $stmt->execute(['cpf' => $cpf]);
            $cliente = $stmt->fetch();
            jsonResponse($cliente ?: null);
        } else {
            $stmt = $pdo->query('SELECT * FROM clientes ORDER BY nome');
            $clientes = $stmt->fetchAll();
            jsonResponse($clientes);
        }

    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) {
            jsonError("Corpo JSON inválido");
        }

        // Usar ID do backup se fornecido, senão gerar novo UUID
        $id = !empty($data['id']) ? $data['id'] : generateUUID();
        $nome = $data['nome'] ?? '';
        $cpf = isset($data['cpf']) ? cleanCpf($data['cpf']) : '';

        // INSERT dinâmico — só inclui campos que existem nos dados
        $fields = ['id', 'nome', 'cpf'];
        $placeholders = [':id', ':nome', ':cpf'];
        $params = ['id' => $id, 'nome' => $nome, 'cpf' => $cpf];

        // Telefone é opcional (campo novo)
        if (isset($data['telefone']) && $data['telefone'] !== '') {
            $fields[] = 'telefone';
            $placeholders[] = ':telefone';
            $params['telefone'] = $data['telefone'];
        }

        $sql = 'INSERT INTO clientes (' . implode(', ', $fields) . ') VALUES (' . implode(', ', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        $stmt = $pdo->prepare('SELECT * FROM clientes WHERE id = :id');
        $stmt->execute(['id' => $id]);
        jsonResponse($stmt->fetch(), 201);

    } elseif ($method === 'PUT') {
        if (!isset($_GET['id'])) {
            jsonError("ID não fornecido", 400);
        }
        $id = $_GET['id'];
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) {
            jsonError("Corpo JSON inválido");
        }

        $fields = [];
        $params = ['id' => $id];

        if (isset($data['nome'])) {
            $fields[] = 'nome = :nome';
            $params['nome'] = $data['nome'];
        }
        if (isset($data['cpf'])) {
            $fields[] = 'cpf = :cpf';
            $params['cpf'] = cleanCpf($data['cpf']);
        }
        if (array_key_exists('telefone', $data)) {
            $fields[] = 'telefone = :telefone';
            $params['telefone'] = $data['telefone'] ?: null;
        }

        if (empty($fields)) {
            jsonError("Nenhum campo para atualizar fornecido");
        }

        $sql = 'UPDATE clientes SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        $stmt = $pdo->prepare('SELECT * FROM clientes WHERE id = :id');
        $stmt->execute(['id' => $id]);
        jsonResponse($stmt->fetch());

    } elseif ($method === 'DELETE') {
        if (!isset($_GET['id'])) {
            jsonError("ID não fornecido", 400);
        }
        $stmt = $pdo->prepare('DELETE FROM clientes WHERE id = :id');
        $stmt->execute(['id' => $_GET['id']]);
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
