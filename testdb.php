<?php
try {
    $pdo = new PDO(
        "mysql:host=localhost;dbname=streamsite;charset=utf8mb4",
        "root",
        "loukaytb-24"
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connexion OK";
} catch (Throwable $e) {
    echo "Erreur : " . $e->getMessage();
}
