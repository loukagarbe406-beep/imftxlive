async function putSessions(slug, sessions) {
  await VIEWERS.put("sessions:" + slug, JSON.stringify(sessions));
}
function cleanExpired(sessions) {
  const now = Math.floor(Date.now() / 1000);
  const cleaned = {};
  for (const [sid, ts] of Object.entries(sessions)) {
    if ((now - ts) <= TTL) {
      cleaned[sid] = ts;
    }
  }
  return cleaned;
}
async function handlePing(request) {
  let body;
  const ct = request.headers.get("content-type") || "";
  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    const fd = await request.formData();
    body = {
      page_slug: fd.get("page_slug") || "",
      session_id: fd.get("session_id") || "",
      action: fd.get("action") || "ping",
    };
  } else {
    try { body = await request.json(); } catch (e) { body = {}; }
  }
  const slug = (body.page_slug || "").replace(/[^a-z0-9_-]/gi, "");
  const sessionId = (body.session_id || "").replace(/[^a-z0-9_-]/gi, "");
  const action = body.action || "ping";
  if (!slug || !sessionId) {
    return new Response(JSON.stringify({ error: "missing params", viewers: 0 }), { headers: corsHeaders() });
  }
  let sessions = await getSessions(slug);
  sessions = cleanExpired(sessions);
  if (action === "leave") {
    delete sessions[sessionId];
  } else {
    sessions[sessionId] = Math.floor(Date.now() / 1000);
  }
  await putSessions(slug, sessions);
  return new Response(JSON.stringify({ viewers: Object.keys(sessions).length }), { headers: corsHeaders() });
}
async function handleCount(url) {
  const slug = (url.searchParams.get("page_slug") || "").replace(/[^a-z0-9_-]/gi, "");
  if (!slug) {
    return new Response(JSON.stringify({ viewers: 0 }), { headers: corsHeaders() });
  }
  let sessions = await getSessions(slug);
  sessions = cleanExpired(sessions);
  return new Response(JSON.stringify({ viewers: Object.keys(sessions).length }), { headers: corsHeaders() });
}
addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});
async function handleRequest(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === "/viewer_ping.php" || path === "/viewer_ping") {
    return handlePing(request);
  }
  if (path === "/viewer_count.php" || path === "/viewer_count") {
    return handleCount(url);
  }
  return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: corsHeaders() });
}
Maintenant je mets à jour le JS dans bayern-rma.html pour qu'il pointe vers le Worker.

Le JS utilise des URLs relatives (/viewer_ping.php, /viewer_count.php). C'est parfait -- le Worker Cloudflare répondra exactement sur ces mêmes chemins. Rien à changer dans le HTML si tu configures le Worker comme route sur ton domaine.

Mais pour que ça marche, il faut que le Worker soit lié à ton domaine imftx.site. Voici les étapes exactes.

Tout est prêt. Le fichier worker-viewer.js est dans tes Downloads. Voici comment le mettre en place :

Étape 1 -- Créer un KV namespace

Va sur dash.cloudflare.com
Menu gauche > Workers & Pages > KV
Clique Create a namespace
Nom : VIEWERS
Clique Add
Étape 2 -- Créer le Worker

Menu gauche > Workers & Pages > Create
Clique Create Worker
Nom : viewer-counter
Clique Deploy (ça crée un worker vide)
Clique Edit Code (en haut à droite)
Supprime tout le code par défaut
Copie-colle tout le contenu du fichier worker-viewer.js
Clique Deploy
Étape 3 -- Lier le KV au Worker

Retourne dans Workers & Pages > viewer-counter > Settings > Bindings
Clique Add > KV Namespace
Variable name : VIEWERS (exactement comme ça, en majuscules)
KV namespace : choisis VIEWERS dans la liste
Clique Save
Étape 4 -- Ajouter les routes sur ton domaine

Va dans Workers & Pages > viewer-counter > Settings > Triggers (ou Routes)
Clique Add route
Route : imftx.site/viewer_ping.php* -- Zone : imftx.site
Ajoute une 2e route : imftx.site/viewer_count.php* -- Zone : imftx.site
Après ça, quand ton site appelle /viewer_ping.php ou /viewer_count.php, Cloudflare intercepte et envoie vers ton Worker. Rien à changer dans le HTML, le compteur marchera directement.
