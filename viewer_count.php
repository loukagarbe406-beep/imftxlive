<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
$dataDir = __DIR__ . '/data';
$pageSlug = isset($_GET['page_slug']) ? preg_replace('/[^a-z0-9_-]/i', '', $_GET['page_slug']) : '';
if (!$pageSlug) {
    echo json_encode(['viewers' => 0]);
    exit;
}
$file = $dataDir . '/viewers_' . $pageSlug . '.json';
$ttl  = 30;
if (!file_exists($file)) {
    echo json_encode(['viewers' => 0]);
    exit;
}
$fp = fopen($file, 'r');
if (!$fp) {
    echo json_encode(['viewers' => 0]);
    exit;
}
flock($fp, LOCK_SH);
$raw = '';
$size = filesize($file);
if ($size > 0) {
    $raw = fread($fp, $size);
}
flock($fp, LOCK_UN);
fclose($fp);
$sessions = $raw ? json_decode($raw, true) : [];
if (!is_array($sessions)) {
    $sessions = [];
}
$now = time();
$count = 0;
foreach ($sessions as $sid => $ts) {
    if (($now - $ts) <= $ttl) {
        $count++;
    }
}
echo json_encode(['viewers' => $count]);
