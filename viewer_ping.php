<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}
$pageSlug  = isset($_POST['page_slug'])  ? preg_replace('/[^a-z0-9_-]/i', '', $_POST['page_slug']) : '';
$sessionId = isset($_POST['session_id']) ? preg_replace('/[^a-z0-9_-]/i', '', $_POST['session_id']) : '';
$action    = isset($_POST['action'])     ? $_POST['action'] : 'ping';
if (!$pageSlug || !$sessionId) {
    echo json_encode(['error' => 'missing params', 'viewers' => 0]);
    exit;
}
$file = $dataDir . '/viewers_' . $pageSlug . '.json';
$ttl  = 30;
$fp = fopen($file, 'c+');
if (!$fp) {
    echo json_encode(['error' => 'cannot open file', 'viewers' => 0]);
    exit;
}
flock($fp, LOCK_EX);
$raw = '';
$size = filesize($file);
if ($size > 0) {
    $raw = fread($fp, $size);
}
$sessions = $raw ? json_decode($raw, true) : [];
if (!is_array($sessions)) {
    $sessions = [];
}
$now = time();
// Nettoyage des sessions expirées (> 30s sans ping)
foreach ($sessions as $sid => $ts) {
    if (($now - $ts) > $ttl) {
        unset($sessions[$sid]);
    }
}
if ($action === 'leave') {
    unset($sessions[$sessionId]);
} else {
    $sessions[$sessionId] = $now;
}
ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($sessions));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);
echo json_encode(['viewers' => count($sessions)]);
