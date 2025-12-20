<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$match = preg_replace('/[^a-zA-Z0-9\-_]/', '', $_POST['match'] ?? 'default');
$name = trim($_POST['name'] ?? '');
$text = trim($_POST['text'] ?? '');
$uid  = preg_replace('/[^a-zA-Z0-9\-_]/', '', $_POST['uid'] ?? '');

if($uid === '' || $name === '' || $text === ''){
  echo json_encode(["ok"=>false,"error"=>"missing"]);
  exit;
}

if(strlen($name) > 16) $name = substr($name,0,16);
if(strlen($text) > 180) $text = substr($text,0,180);

$file = __DIR__ . "/data_$match.json";
$now = time();

$data = ["messages"=>[], "pings"=>[]];
if(file_exists($file)){
  $tmp = json_decode(@file_get_contents($file), true);
  if(is_array($tmp)) $data = $tmp;
}
if(!isset($data["messages"]) || !is_array($data["messages"])) $data["messages"] = [];
if(!isset($data["pings"]) || !is_array($data["pings"])) $data["pings"] = [];

$lastKey = "last_" . $uid;
$last = $data[$lastKey] ?? 0;
if(($now - $last) < 2){
  echo json_encode(["ok"=>false,"error"=>"rate"]);
  exit;
}
$data[$lastKey] = $now;

$data["messages"][] = ["name"=>$name,"text"=>$text,"ts"=>$now];
if(count($data["messages"]) > 120) $data["messages"] = array_slice($data["messages"], -120);

$data["pings"][$uid] = $now;

@file_put_contents($file, json_encode($data, JSON_UNESCAPED_UNICODE));
echo json_encode(["ok"=>true], JSON_UNESCAPED_UNICODE);
