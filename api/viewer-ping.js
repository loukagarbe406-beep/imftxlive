import mysql from 'mysql2/promise';

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10
    });
  }
  return pool;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { page_slug, session_id, action = 'ping' } = req.body || {};

    if (!page_slug || !session_id) {
      return res.status(400).json({ error: 'missing data' });
    }

    const db = getPool();

    if (action === 'leave') {
      await db.execute(
        `UPDATE live_viewers
         SET is_online = 0
         WHERE page_slug = ? AND session_id = ?`,
        [page_slug, session_id]
      );
    } else {
      await db.execute(
        `INSERT INTO live_viewers (page_slug, session_id, is_online, last_seen)
         VALUES (?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE
           is_online = 1,
           last_seen = NOW()`,
        [page_slug, session_id]
      );
    }

    await db.execute(
      `UPDATE live_viewers
       SET is_online = 0
       WHERE last_seen < NOW() - INTERVAL 60 SECOND`
    );

    const [rows] = await db.execute(
      `SELECT COUNT(*) AS viewers
       FROM live_viewers
       WHERE page_slug = ?
         AND is_online = 1
         AND last_seen >= NOW() - INTERVAL 60 SECOND`,
      [page_slug]
    );

    return res.status(200).json({
      success: true,
      viewers: rows[0].viewers || 0
    });
  } catch (e) {
    return res.status(500).json({
      error: 'server error',
      message: e.message
    });
  }
}
