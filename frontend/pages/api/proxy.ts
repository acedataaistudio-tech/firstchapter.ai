import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const path = req.query.path as string[];
  const url = `${BACKEND}/${path.join("/")}`;

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        ...(req.headers["x-user-id"] ? { "x-user-id": req.headers["x-user-id"] as string } : {}),
        ...(req.headers["x-admin-secret"] ? { "x-admin-secret": req.headers["x-admin-secret"] as string } : {}),
      },
      ...(req.method !== "GET" && req.body ? { body: JSON.stringify(req.body) } : {}),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (e) {
    res.status(500).json({ error: "Proxy error" });
  }
}