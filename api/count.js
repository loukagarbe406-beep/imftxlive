import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const match = req.query.match || "default";

  // clé unique par match
  const key = `viewers:${match}`;

  // incrément + expiration auto
  await redis.incr(key);
  await redis.expire(key, 10); // 10s = viewers "en ligne"

  const count = await redis.get(key);

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ count: count || 1 });
}
