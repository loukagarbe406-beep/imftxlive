<?php
/**
 * Chat temps réel (polling) — une salle par room (ex: om-metz).
 * Crée data/live_chat/ automatiquement (chmod 755 ou 775 selon hébergeur).
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$rawIn = file_get_contents('php://input');
$jsonIn = $rawIn !== '' && $rawIn !== false ? json_decode($rawIn, true) : null;
$in = is_array($jsonIn) ? $jsonIn : $_POST;

$room = isset($in['room']) ? (string) $in['room'] : (isset($_GET['room']) ? (string) $_GET['room'] : 'default');
$room = preg_replace('/[^a-zA-Z0-9_-]/', '', $room);
if ($room === '') {
    $room = 'default';
}

$dataDir = __DIR__ . '/data/live_chat';
if (!is_dir($dataDir) && !@mkdir($dataDir, 0755, true)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Cannot create data directory']);
    exit;
}

$storePath = $dataDir . '/' . $room . '.json';
$maxMessages = 400;
$maxText = 320;
$maxUser = 28;
$rateSeconds = 2;

function default_store(): array {
    return ['nextId' => 1, 'messages' => []];
}

function parse_store(string $raw): array {
    if ($raw === '') {
        return default_store();
    }
    $data = json_decode($raw, true);
    if (!is_array($data) || !isset($data['messages']) || !is_array($data['messages'])) {
        return default_store();
    }
    $nextId = isset($data['nextId']) ? (int) $data['nextId'] : 1;

    return ['nextId' => max(1, $nextId), 'messages' => $data['messages']];
}

function sanitize_user(string $s, int $max): string {
    $s = strip_tags($s);
    $s = preg_replace('/\s+/u', ' ', trim($s));
    if (function_exists('mb_substr')) {
        return mb_substr($s, 0, $max);
    }

    return substr($s, 0, $max);
}

function sanitize_text(string $s, int $max): string {
    $s = strip_tags($s);
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s);
    $s = trim($s);
    if (function_exists('mb_substr')) {
        return mb_substr($s, 0, $max);
    }

    return substr($s, 0, $max);
}

function rate_check(string $dataDir, string $clientId, int $rateSeconds): bool {
    if ($clientId === '') {
        return false;
    }
    $safe = preg_replace('/[^a-zA-Z0-9_-]/', '', $clientId);
    $safe = substr($safe, 0, 80);
    $rateFile = $dataDir . '/.rate_' . md5($safe);
    $now = microtime(true);
    $fp = @fopen($rateFile, 'c+');
    if ($fp === false) {
        return true;
    }
    if (!flock($fp, LOCK_EX)) {
        fclose($fp);

        return false;
    }
    $last = 0.0;
    rewind($fp);
    $buf = stream_get_contents($fp);
    if ($buf !== false && $buf !== '') {
        $last = (float) $buf;
    }
    if ($now - $last < $rateSeconds) {
        flock($fp, LOCK_UN);
        fclose($fp);

        return false;
    }
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, (string) $now);
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    return true;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $since = isset($_GET['since']) ? (int) $_GET['since'] : 0;
    $raw = '';
    if (is_readable($storePath)) {
        $raw = (string) file_get_contents($storePath);
    }
    $data = parse_store($raw);
    $list = $data['messages'];
    if ($since > 0) {
        $list = array_values(array_filter($list, static function ($m) use ($since) {
            return isset($m['id']) && (int) $m['id'] > $since;
        }));
    } else {
        $list = array_slice($list, -120);
    }
    echo json_encode(['ok' => true, 'messages' => $list, 'room' => $room], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$user = sanitize_user((string) ($in['user'] ?? ''), $maxUser);
$text = sanitize_text((string) ($in['text'] ?? ''), $maxText);
$clientId = isset($in['client_id']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $in['client_id']) : '';
$clientId = substr($clientId, 0, 80);

if ($user === '' || $text === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Pseudo ou message vide']);
    exit;
}

$rateKey = $clientId !== '' ? $clientId : ('ip_' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
if (!rate_check($dataDir, $rateKey, $rateSeconds)) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'Doucement — attends un instant.']);
    exit;
}

$fp = fopen($storePath, 'c+');
if ($fp === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Cannot open store']);
    exit;
}

if (!flock($fp, LOCK_EX)) {
    fclose($fp);
    http_response_code(503);
    echo json_encode(['ok' => false, 'error' => 'Busy']);
    exit;
}

try {
    rewind($fp);
    $raw = stream_get_contents($fp);
    if ($raw === false) {
        $raw = '';
    }
    $data = parse_store($raw);
    $id = $data['nextId']++;
    $msg = [
        'id' => $id,
        'user' => $user,
        'text' => $text,
        'ts' => time(),
    ];
    $data['messages'][] = $msg;
    if (count($data['messages']) > $maxMessages) {
        $data['messages'] = array_slice($data['messages'], -$maxMessages);
    }
    $out = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    rewind($fp);
    ftruncate($fp, 0);
    fwrite($fp, $out);
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    echo json_encode(['ok' => true, 'message' => $msg, 'room' => $room], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    flock($fp, LOCK_UN);
    fclose($fp);
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server error']);
}
