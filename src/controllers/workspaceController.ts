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


  const body = crypto.randomBytes(16).toString("hex") + wsId
  const key = await crypto.createHash('sha256').update(body).digest('hex')

  try {

    const workspace = await db.query("SELECT * FROM workspaces WHERE id = $1", [wsId])
    if (!workspace.rows.length) return res.status(404).json({ error: "Workspace not found" })

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

async function getStatsForWorkspace(req: Request, res: Response) {
  const wsId = Number(req.params.wsId)
  try {
    // count by status
    const countStatus = await db.query(
      "SELECT status, COUNT(*) FROM tasks WHERE workspace_id = $1 GROUP BY status",
      [wsId]
    )
    if (countStatus.rows.length === 0) res.status(404).json({ error: "no tasks available" })

    const topTags = await db.query(
      "SELECT t.name, COUNT(*) as tag_count FROM task_tags tt JOIN tags t ON tt.tag_id = t.id JOIN tasks ta ON tt.task_id = ta.id WHERE ta.workspace_id = $1 GROUP BY t.name ORDER BY tag_count DESC LIMIT 5",
      [wsId]
    )

    const overdueTasks = await db.query(
      "SELECT COUNT(*) FROM tasks WHERE workspace_id = $1 AND due_date < NOW() AND status != 'done'",
      [wsId]
    )

    res.status(200).json({ stats: countStatus.rows, topTags: topTags.rows, overdueTasks: overdueTasks.rows[0].count })

  } catch (error) {
    console.error('Error getting stats for workspace', error)
    res.status(500).json({ error: 'Internal server error' })
  }

}


// Routers

const workspaceRouter = Router()

workspaceRouter.post("/", createWorkspace)
workspaceRouter.post("/:wsId/apikeys", generateAPIKey)
workspaceRouter.get("/:wsId/stats", getStatsForWorkspace)

export default workspaceRouter
