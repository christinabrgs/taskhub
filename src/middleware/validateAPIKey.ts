import { type Request, type Response, type NextFunction } from "express";
import db from "../db/connection";
import crypto from "crypto";

export async function validateApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const apiKey = req.headers["x-api-key"];
    const wsId = Number(req.params.wsId);

    if (!apiKey) {
      return res.status(401).json({ error: "Missing API key" });
    }

    if (typeof apiKey !== "string") {
      return res.status(401).json({ error: "API key is not of type String" });
    }

    const key = crypto.createHash("sha256").update(apiKey).digest("hex"); // using lower saltOrRounds value to ensure faster processing
    // Find API key in DB
    const apiKeyRecord = await db.query(
      `SELECT id, workspace_id FROM api_keys WHERE key = $1 AND workspace_id = $2`,
      [key, wsId],
    );

    if (apiKeyRecord.rowCount === 0) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    res.locals.apiKey = apiKeyRecord.rows[0];
    res.locals.wsId = wsId;

    next();
  } catch (error) {
    console.error("Error validating API key:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function validateWsId(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const num = Number(req.params.wsId);

  if (!Number.isInteger(num)) {
    return res
      .status(400)
      .json({ error: `Invalid workspace ID: ${req.params.wsId}` });
  }

  res.locals.wsId = num;

  next();
}
