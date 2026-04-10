<?php
header('Content-Type: application/json');

try {
    $pdo = new PDO(
        "mysql:host=localhost;dbname=streamsite;charset=utf8mb4",
        "root",
        "loukaytb-24"
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $page = $_POST['page_slug'] ?? '';
    $session = $_POST['session_id'] ?? '';
    $action = $_POST['action'] ?? 'ping';

    if (!$page || !$session) {
        echo json_encode([
            "success" => false,
            "error" => "missing data",
            "post" => $_POST
        ]);
        exit;
    }

    $sql = "
    INSERT INTO live_viewers (page_slug, session_id, is_online, last_seen)
    VALUES (:page_slug, :session_id, 1, NOW())
    ON DUPLICATE KEY UPDATE
      is_online = 1,
      last_seen = NOW()
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':page_slug' => $page,
        ':session_id' => $session
    ]);

    $stmt = $pdo->query("SELECT COUNT(*) FROM live_viewers");
    $total = (int)$stmt->fetchColumn();

    echo json_encode([
        "success" => true,
        "message" => "insert ok",
        "total_rows" => $total,
        "page_slug" => $page,
        "session_id" => $session,
        "action" => $action
    ]);

} catch (Throwable $e) {
    echo json_encode([
        "success" => false,
        "error" => $e->getMessage()
    ]);
}
