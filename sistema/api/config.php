<?php
// ═══════════════════════════════════════════════════════════════
// Raíz & Pixel — Configuração do Banco de Dados
// Suporta: PostgreSQL (Supabase via Render) e MySQL (XAMPP local)
// ═══════════════════════════════════════════════════════════════

// Lê credenciais de variáveis de ambiente (Render/produção)
// ou usa valores padrão para desenvolvimento local (XAMPP)
$db_driver = getenv('DB_DRIVER') ?: 'mysql';
$db_host   = getenv('DB_HOST')   ?: 'localhost';
$db_port   = getenv('DB_PORT')   ?: ($db_driver === 'pgsql' ? '5432' : '3306');
$db_name   = getenv('DB_NAME')   ?: 'raiz_pixel';
$db_user   = getenv('DB_USER')   ?: 'root';
$db_pass   = getenv('DB_PASS')   ?: '';

define('DB_DRIVER', $db_driver);
define('DB_HOST',   $db_host);
define('DB_PORT',   $db_port);
define('DB_NAME',   $db_name);
define('DB_USER',   $db_user);
define('DB_PASS',   $db_pass);

// Timezone Brasil
date_default_timezone_set('America/Sao_Paulo');

// ── CORS — permite acesso do sistema local e do formulário ───────
$allowed_origins = ['http://localhost', 'http://localhost:8080', 'http://127.0.0.1'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/**
 * Retorna uma conexão PDO com o banco de dados configurado.
 * Funciona com MySQL (XAMPP local) e PostgreSQL (Supabase).
 */
function getConnection() {
    try {
        if (DB_DRIVER === 'pgsql') {
            // PostgreSQL — Supabase (produção)
            $dsn = sprintf(
                'pgsql:host=%s;port=%s;dbname=%s;sslmode=require',
                DB_HOST, DB_PORT, DB_NAME
            );
        } else {
            // MySQL — XAMPP (desenvolvimento local)
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                DB_HOST, DB_PORT, DB_NAME
            );
        }

        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);

        // Timezone só no MySQL
        if (DB_DRIVER === 'mysql') {
            $pdo->exec("SET time_zone = '-03:00'");
        }

        return $pdo;

    } catch (PDOException $e) {
        jsonError('Erro de conexão com o banco de dados: ' . $e->getMessage(), 500);
        exit();
    }
}

/**
 * Gera um UUID v4 (gerado em PHP, compatível com MySQL e PostgreSQL).
 */
function generateUUID() {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

/**
 * Envia resposta JSON com status HTTP.
 */
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * Envia resposta de erro em JSON.
 */
function jsonError($message, $status = 400) {
    jsonResponse(['error' => $message], $status);
}
?>
