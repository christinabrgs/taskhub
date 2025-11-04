import db from '../db/connection';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { validateApiKey } from '../middleware/validateAPIKey';


const tagSchema = z.object({
  name: z.string().min(1, "name cannot be empty"),
})

async function upsertTag(req: Request, res: Response) {
  const wsId = res.locals.wsId

  const name = req.params.name

  const safeParse = tagSchema.safeParse({ name })

  if (!safeParse.success) {
    return res.status(400).json({ error: safeParse.error.issues })
  }

  try {
    const result = await db.query(
      // logical thing to do here would be to DO NOTHING but we want to return the value
      `INSERT INTO tags (name, workspace_id) VALUES ($1, $2) ON CONFLICT (name, workspace_id) DO UPDATE SET name = EXCLUDED.name RETURNING *;`,
      [safeParse.data.name, wsId]
    )
    res.status(201).json({ tag: result.rows[0] })
  } catch (error) {
    console.error('Error upserting tag:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}




const tagRouter = Router({ mergeParams: true })
tagRouter.use(validateApiKey)

tagRouter.put('/:name', upsertTag)

export default tagRouter
