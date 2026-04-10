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
        http_response_code(400);
        echo json_encode(["error" => "missing data"]);
        exit;
    }

    if ($action === 'leave') {
        $sql = "UPDATE live_viewers
                SET is_online = 0
                WHERE page_slug = :page_slug AND session_id = :session_id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':page_slug' => $page,
            ':session_id' => $session
        ]);
    } else {
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
    }

    $cleanup = "
    UPDATE live_viewers
    SET is_online = 0
    WHERE last_seen < NOW() - INTERVAL 60 SECOND
    ";
    $pdo->exec($cleanup);

    $countSql = "
    SELECT COUNT(*) AS viewers
    FROM live_viewers
    WHERE page_slug = :page_slug
      AND is_online = 1
      AND last_seen >= NOW() - INTERVAL 60 SECOND
    ";
    $stmt = $pdo->prepare($countSql);
    $stmt->execute([':page_slug' => $page]);
    $count = (int)$stmt->fetchColumn();

    echo json_encode([
        "success" => true,
        "viewers" => $count
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "server error",
        "message" => $e->getMessage()
    ]);
}
