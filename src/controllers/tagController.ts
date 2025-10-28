import db from '../db/connection';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { validateApiKey } from '../middleware/validateAPIKey';


const tagSchema = z.object({
  name: z.string().min(1, "name cannot be empty"),
})

async function upsertTag(req: Request, res: Response) {
  const wsId = Number(req.params.wsId)
  const name = req.params.name

  const body = tagSchema.parse({ name })

  try {
    const result = await db.query(
      // best practice here would be to do nothing but when a value exists, the tag does not return the row in the response, so for clarity in the output, we are updating the name to itself
      `INSERT INTO tags (name, workspace_id) VALUES ($1, $2) ON CONFLICT (name, workspace_id) DO UPDATE SET name = EXCLUDED.name RETURNING *;`,
      [body.name, wsId]
    )
    res.status(201).json({ tag: result.rows[0] })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    console.error('Error upserting tag:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}




const tagRouter = Router({ mergeParams: true })

tagRouter.put('/:name', validateApiKey, upsertTag)

export default tagRouter
