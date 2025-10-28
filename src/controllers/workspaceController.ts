import db from '../db/connection';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcrypt';


const workspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name cannot be empty')
})

async function createWorkspace(req: Request, res: Response) {

  const body = workspaceSchema.parse(req.body)

  try {
    const result = await db.query(
      "INSERT INTO workspaces (name) VALUES ($1) RETURNING *",
      [body.name]
    )
    res.status(201).json({ workspace: result.rows[0] })
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    console.error('Error creating workspace:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
};

async function generateAPIKey(req: Request, res: Response) {
  const wsId = Number(req.params.wsId)

  const workspace = await db.query("SELECT * FROM workspaces WHERE id = $1", [wsId])
  if (!workspace.rows.length) return res.status(404).json({ error: "Workspace not found" })

  const body = crypto.randomBytes(16).toString("hex") + wsId
  const key = await crypto.createHash('sha256').update(body).digest('hex')
  console.log(body, key)

  try {
    const result = await db.query(
      "INSERT into api_keys (workspace_id, key) VALUES ($1, $2) RETURNING id",
      [wsId, key]
    )
    res.status(201).json({ apiKey: body, id: result.rows[0] })
  }
  catch (error) {
    console.error('Error generating APIKey', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Routers

const workspaceRouter = Router()

workspaceRouter.post("/", createWorkspace)
workspaceRouter.post("/:wsId/apikeys", generateAPIKey)

export default workspaceRouter
