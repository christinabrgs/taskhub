
import { type Request, type Response, type NextFunction } from 'express';
import db from '../db/connection';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export async function validateApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = req.headers['x-api-key']
    const wsId = Number(req.params.wsId)

    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API key' })
    }

    if (typeof apiKey !== 'string') {
      return res.status(401).json({ error: 'API key is not of type String' })
    }

    const key = crypto.createHash('sha256').update(apiKey).digest('hex') // using lower saltOrRounds value to ensure faster processing 
    console.log(apiKey, key)
    // Find API key in DB
    const apiKeyRecord = await db.query(
      `SELECT id, workspace_id FROM api_keys WHERE key = $1 AND workspace_id = $2`,
      [key, wsId]
    )

    if (apiKeyRecord.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid API key' })
    }

    res.locals.apiKey = apiKeyRecord.rows[0]

    next()
  } catch (error) {
    console.error('Error validating API key:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
