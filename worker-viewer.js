
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
