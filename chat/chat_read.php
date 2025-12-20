<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$match = preg_replace('/[^a-zA-Z0-9\-_]/', '', $_GET['match'] ?? 'default');
$file = __DIR__ . "/data_$match.json";

if(!file_exists($file)){
  echo json_encode(["ok"=>true,"messages"=>[],"online"=>0]);
  exit;
}

$data = json_decode(@file_get_contents($file), true);
if(!is_array($data)) $data = [];

$now = time();
$messages = $data["messages"] ?? [];
$pings = $data["pings"] ?? [];

$newPings = [];
foreach($pings as $k=>$ts){
  if(($now - $ts) <= 60) $newPings[$k] = $ts;
}

$online = count($newPings);

if(count($messages) > 120) $messages = array_slice($messages, -120);

echo json_encode(["ok"=>true,"messages"=>$messages,"online"=>$online], JSON_UNESCAPED_UNICODE);
