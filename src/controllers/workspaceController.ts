import db from "../db/connection";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { validateApiKey, validateWsId } from "../middleware/validateAPIKey";
import { DatabaseError } from "pg";

const workspaceSchema = z.object({
  name: z.string().min(1, "Workspace name cannot be empty"),
});

async function createWorkspace(req: Request, res: Response) {
  try {
    const safeParse = workspaceSchema.safeParse(req.body)

    if (!safeParse.success) {
      return res.status(400).json({ error: safeParse.error.issues })
    }

    const result = await db.query(
      "INSERT INTO workspaces (name) VALUES ($1) RETURNING *",
      [safeParse.data.name],
    );
    res.status(201).json({ workspace: result.rows[0] });
  } catch (error) {
    console.error("Error creating workspace:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function generateAPIKey(_req: Request, res: Response) {
  const wsId = res.locals.wsId;

  const body = crypto.randomBytes(16).toString("hex") + wsId;
  const key = crypto.createHash("sha256").update(body).digest("hex");

  try {
    const result = await db.query(
      "INSERT into api_keys (workspace_id, key) VALUES ($1, $2) RETURNING id",
      [wsId, key],
    );
    res.status(201).json({ apiKey: body, id: result.rows[0] });
  } catch (error) {
    console.error("Error generating APIKey", error);
    // The `23503` error code is for Foreign Key violations
    // This likely means the workspace doesn't exist
    if (error instanceof DatabaseError && error.code === "23503") {
      return res.status(404).json({ error: "Workspace not found" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getStatsForWorkspace(_req: Request, res: Response) {
  try {
    const wsId = res.locals.wsId;

    const countStatus = await db.query(
      "SELECT status, COUNT(*) FROM tasks WHERE workspace_id = $1 GROUP BY status",
      [wsId],
    );

    const topTags = await db.query(
      "SELECT t.name, COUNT(*) as tag_count FROM task_tags tt JOIN tags t ON tt.tag_id = t.id JOIN tasks ta ON tt.task_id = ta.id WHERE ta.workspace_id = $1 GROUP BY t.name ORDER BY tag_count DESC LIMIT 5",
      [wsId],
    );

    const overdueTasks = await db.query(
      "SELECT COUNT(*) FROM tasks WHERE workspace_id = $1 AND due_date < NOW() AND status != 'done'",
      [wsId],
    );

    res
      .status(200)
      .json({
        stats: countStatus.rows,
        topTags: topTags.rows,
        overdueTasks: overdueTasks.rows[0].count,
      });
  } catch (error) {

    if (error instanceof DatabaseError && error.code === "23503") {
      return res.status(404).json({ error: "Workspace not found" });
    }

    console.error("Error getting stats for workspace", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Routers

const workspaceRouter = Router();

workspaceRouter.post("/", createWorkspace);
workspaceRouter.post("/:wsId/apikeys", validateWsId, generateAPIKey);
workspaceRouter.get(
  "/:wsId/stats",
  validateWsId,
  validateApiKey,
  getStatsForWorkspace,
);

export default workspaceRouter;
