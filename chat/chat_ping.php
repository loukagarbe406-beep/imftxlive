<?php
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$match = preg_replace('/[^a-zA-Z0-9\-_]/', '', $_GET['match'] ?? 'default');
$id = preg_replace('/[^a-zA-Z0-9\-_]/', '', $_GET['id'] ?? '');

if($id === ''){
  echo "0";
  exit;
}

$file = __DIR__ . "/data_$match.json";
$now = time();

$data = ["messages"=>[], "pings"=>[]];
if(file_exists($file)){
  $raw = file_get_contents($file);
  $tmp = json_decode($raw, true);
  if(is_array($tmp)) $data = $tmp;
}

if(!isset($data["pings"]) || !is_array($data["pings"])) {
  $data["pings"] = [];
}

$data["pings"][$id] = $now;

file_put_contents($file, json_encode($data, JSON_UNESCAPED_UNICODE));
echo "1";
