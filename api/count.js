import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  const match = (req.query.match || "default").toString();
  const keys = await redis.keys(`views:${match}:*`);
  res.status(200).send(String(keys.length));
}
