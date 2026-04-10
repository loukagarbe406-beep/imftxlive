<?php
try {
    $pdo = new PDO(
        "mysql:host=localhost;dbname=streamsite;charset=utf8mb4",
        "root",
        "TON_MOT_DE_PASSE"
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connexion OK";
} catch (Throwable $e) {
    echo "Erreur : " . $e->getMessage();
}
