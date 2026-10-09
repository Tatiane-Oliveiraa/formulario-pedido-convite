<?php
/**
 * Raíz & Pixel — Endpoint para receber pedidos do formulário externo.
 *
 * Este arquivo recebe os dados diretamente via POST (JSON) ou via GET
 * (query params), cria o cliente se necessário e registra o pedido.
 *
 * Aceita tanto POST com corpo JSON quanto GET com query parameters
 * para máxima compatibilidade com o formulário externo.
 */
require_once __DIR__ . '/config.php';

$pdo = getConnection();

try {
    // ── 1. Coletar os dados (suporta POST JSON e GET query params) ──
    $data = null;

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $rawBody = file_get_contents('php://input');
        $data = json_decode($rawBody, true);

        // Se o POST não veio como JSON, tenta usar $_POST
        if (!$data && !empty($_POST)) {
            $data = $_POST;
        }
    }

    // Fallback: GET com query params (compatibilidade com o método antigo)
    if (!$data || empty($data)) {
        $data = $_GET;
    }

    if (empty($data)) {
        jsonResponse(['success' => false, 'error' => 'Nenhum dado recebido'], 400);
    }

    // ── 2. Extrair dados do contratante ─────────────────────────
    $nomeContratante     = trim($data['nomeContratante'] ?? '');
    $cpfContratante      = preg_replace('/[^0-9]/', '', $data['cpfContratante'] ?? '');
    $telefoneContratante = trim($data['telefoneContratante'] ?? '');

    if (empty($nomeContratante) || empty($cpfContratante)) {
        jsonResponse(['success' => false, 'error' => 'Nome e CPF do contratante são obrigatórios'], 400);
    }

    // ── 3. Buscar ou criar o cliente ────────────────────────────
    $stmt = $pdo->prepare('SELECT * FROM clientes WHERE cpf = :cpf');
    $stmt->execute(['cpf' => $cpfContratante]);
    $cliente = $stmt->fetch();

    if (!$cliente) {
        $clienteId = generateUUID();
        $fields = ['id', 'nome', 'cpf'];
        $placeholders = [':id', ':nome', ':cpf'];
        $params = ['id' => $clienteId, 'nome' => $nomeContratante, 'cpf' => $cpfContratante];

        if (!empty($telefoneContratante)) {
            $fields[] = 'telefone';
            $placeholders[] = ':telefone';
            $params['telefone'] = $telefoneContratante;
        }

        $sql = 'INSERT INTO clientes (' . implode(', ', $fields) . ') VALUES (' . implode(', ', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    } else {
        $clienteId = $cliente['id'];

        // Atualizar telefone se estava vazio e agora foi informado
        if (empty($cliente['telefone']) && !empty($telefoneContratante)) {
            $stmt = $pdo->prepare('UPDATE clientes SET telefone = :telefone WHERE id = :id');
            $stmt->execute(['telefone' => $telefoneContratante, 'id' => $clienteId]);
        }
    }

    // ── 4. Montar dados do pedido ───────────────────────────────
    $pedidoId = generateUUID();

    // Mapear campos do formulário para os campos do banco de dados
    $subtotal = floatval($data['subtotal'] ?? 0);
    $total    = floatval($data['total'] ?? 0);

    $pedidoParams = [
        'id'                    => $pedidoId,
        'cliente_id'            => $clienteId,
        'nome_aniversariante'   => trim($data['nomeAniversariante'] ?? ''),
        'data_evento'           => !empty($data['dataEvento']) ? $data['dataEvento'] : null,
        'hora_evento'           => !empty($data['horaEvento']) ? $data['horaEvento'] : null,
        'local_evento'          => trim($data['localEvento'] ?? ''),
        'tema_festa'            => trim($data['temaFesta'] ?? ''),
        'trilha_sonora'         => trim($data['trilhaSonora'] ?? ''),
        'dress_code'            => trim($data['dressCode'] ?? $data['dress_code'] ?? ''),
        'paleta_cores'          => trim($data['paletaCores'] ?? $data['paleta_cores'] ?? ''),
        'cores_convite'         => trim($data['coresConvite'] ?? $data['cores_convite'] ?? ''),
        'confirmacao_presenca'  => trim($data['confirmacaoPresenca'] ?? $data['confirmacao_presenca'] ?? ''),
        'whatsapp_confirmacao'  => trim($data['whatsappConfirmacao'] ?? $data['whatsapp_confirmacao'] ?? ''),
        'mensagem_confirmacao'  => trim($data['mensagemConfirmacao'] ?? $data['mensagem_confirmacao'] ?? ''),
        'sugestoes_presente'    => trim($data['sugestoesPresente'] ?? $data['sugestoes_presente'] ?? ''),
        'chave_pix'             => trim($data['chavePixValor'] ?? $data['chave_pix'] ?? ''),
        'manual_convidado'      => trim($data['manualConvidadoValor'] ?? $data['manual_convidado'] ?? ''),
        'outros_detalhes'       => trim($data['outrosValor'] ?? $data['outros_detalhes'] ?? ''),
        'observacoes'           => trim($data['observacoes'] ?? $data['observacoes_cliente'] ?? ''),
        'modelo'                => trim($data['modeloSelect'] ?? $data['modelo'] ?? ''),
        'botoes_interativos'    => trim($data['botoesInterativos'] ?? ''),
        'complementos'          => trim($data['complementos'] ?? ''),
        'album_fotos'           => trim($data['albumFotos'] ?? 'Nenhum'),
        'forma_pagamento'       => trim($data['pagamento'] ?? $data['forma_pagamento'] ?? ''),
        'subtotal'              => $subtotal,
        'valor_total'           => $total,
        'aceite_termos'         => 1,
        'texto_termos'          => trim($data['termsText'] ?? $data['texto_termos'] ?? ''),
        'status'                => 'Novo'
    ];

    // Construir INSERT dinâmico, pulando valores null para campos de data
    $nullableFields = ['data_evento', 'hora_evento'];
    $fields = [];
    $placeholders = [];
    $params = [];

    foreach ($pedidoParams as $field => $value) {
        if ($value === null && in_array($field, $nullableFields)) {
            continue; // deixa MySQL usar DEFAULT
        }
        $fields[] = $field;
        $placeholders[] = ':' . $field;
        $params[$field] = $value;
    }

    $sql = 'INSERT INTO pedidos (' . implode(', ', $fields) . ') VALUES (' . implode(', ', $placeholders) . ')';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    // ── 5. Resposta de sucesso ──────────────────────────────────
    jsonResponse([
        'success' => true,
        'pedido_id' => $pedidoId,
        'cliente_id' => $clienteId,
        'mensagem' => 'Pedido registrado com sucesso!'
    ], 201);

} catch (PDOException $e) {
    jsonResponse(['success' => false, 'error' => 'Erro no banco de dados: ' . $e->getMessage()], 500);
} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => 'Erro interno: ' . $e->getMessage()], 500);
}
?>
