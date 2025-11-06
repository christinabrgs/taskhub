import db from "../db/connection";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { validateApiKey } from "../middleware/validateAPIKey";

const taskSchema = z.object({
  title: z.string().min(1, "title cannot be empty"),
  description: z.string().min(1, "description cannot be empty"),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  dueDate: z.coerce.date().optional(),
});

const partialTaskUpdateSchema = z.object({
  title: z.string().min(1, "title cannot be empty").optional(),
  description: z.string().min(1, "description cannot be empty").optional(),
  status: z.enum(["todo", "in_progress", "done"]).default("todo").optional(),
  dueDate: z.coerce.date().optional(),
});

const tagSchema = z.object({
  name: z.string().min(1, "name cannot be empty"),
});

const taskListSchema = z.object({
  q: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  due_before: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  tag: z.string().optional(),
});

async function createTask(req: Request, res: Response) {
  const wsId = res.locals.wsId;
  const { id: apiKey } = res.locals.apiKey;

  try {
    const safeParse = taskSchema.safeParse(req.body);

    if (!safeParse.success) {
      return res.status(400).json({ error: safeParse.error.issues })
    }

    const result = await db.query(
      "INSERT INTO tasks (title, description, status, due_date, created_by, workspace_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [safeParse.data.title, safeParse.data.description, safeParse.data.status, safeParse.data.dueDate, apiKey, wsId],
    );
    res.status(201).json({ task: result.rows[0] });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getTasks(req: Request, res: Response) {
  const safeParse = taskListSchema.safeParse(req.query)

  if (!safeParse.success) {
    return res.status(400).json({ error: safeParse.error.issues })
  }

  const { status, due_before, q, cursor, limit, tag } = safeParse.data

  const wsId = res.locals.wsId;

  // aggrigating multiple rows of tags to an array and returning one row
  let query =
    "SELECT tasks.*, array_agg(tags.name) as tag_names FROM tasks LEFT JOIN task_tags ON task_tags.task_id = tasks.id LEFT JOIN tags ON task_tags.tag_id = tags.id WHERE tasks.workspace_id = $1 AND deleted_at IS NULL";

  // I should probably have an actual type here, but this works in the mean time
  let values: unknown[] = [wsId];
  let index = 2;

  if (status) {
    query += ` AND tasks.status = $${index}`;
    values.push(status);
    index++;
  }

  if (due_before) {
    query += ` AND tasks.due_date < $${index}`;
    values.push(due_before);
    index++;
  }

  if (q) {
    query += ` AND (tasks.title ILIKE $${index} OR tasks.description ILIKE $${index})`;
    values.push(`%${q}%`);
    index++;
  }

  if (cursor) {
    query += ` AND tasks.id > $${index}`;
    values.push(cursor);
    index++;
  }

  if (tag) {
    // not the best approach for performance, considering we are doing a query within a query, but it works for now
    query += ` AND tasks.id IN (
       SELECT DISTINCT tt.task_id
       FROM task_tags tt
       JOIN tags t ON tt.tag_id = t.id
       WHERE t.name = $${index}
     )`;
    values.push(tag);
    index++;
  }

  values.push(limit || 10);

  try {
    let cursor: number | null = null;

    const result = await db.query(
      query + ` GROUP BY tasks.id ORDER BY tasks.id ASC LIMIT $${index};`,
      values,
    );

    if (result.rows.length === limit) {
      cursor = result.rows[result.rows.length - 1].id;
    }

    res.status(200).json({ tasks: result.rows, cursor });
  } catch (error) {
    console.error("Error getting task:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function deleteTask(req: Request, res: Response) {
  const wsId = res.locals.wsId;
  const taskId = Number(req.params.taskId);

  try {
    const rows = await db.query("UPDATE tasks SET deleted_at = NOW() WHERE id = $1 AND workspace_id = $2", [
      taskId,
      wsId
    ]);

    if (!rows.rowCount) {
      return res.status(400).json({ error: "Delete failed" })
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function updateTask(req: Request, res: Response) {
  const wsId = res.locals.wsId;
  const taskId = Number(req.params.taskId);

  const safeParse = partialTaskUpdateSchema.safeParse(req.body);

  if (!safeParse.success) {
    return res.status(400).json({ error: safeParse.error.issues })
  }

  const fields = [];
  const values = [];
  let idx = 1;

  for (const key in safeParse.data) {
    let column = key === "dueDate" ? "due_date" : key;
    fields.push(`${column} = $${idx}`);
    values.push(safeParse.data[key as keyof typeof safeParse.data]);
    idx++;
  }
  values.push(taskId);

  const query = `UPDATE tasks SET ${fields.join(", ")} WHERE id = $${idx} AND workspace_id = $${idx + 1} RETURNING *`;
  values.push(wsId);

  try {
    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.status(200).json({ task: result.rows[0] });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function attachTagToTask(req: Request, res: Response) {
  const wsId = res.locals.wsId;
  const taskId = Number(req.params.taskId);

  const name = req.params.name;

  const safeParse = tagSchema.safeParse({ name });

  if (!safeParse.success) {
    return res.status(400).json({ error: safeParse.error.issues })
  }

  try {
    // check if tag exists, if it doesn't create it
    const tagQuery = await db.query(
      `INSERT INTO tags (name, workspace_id) VALUES ($1, $2) ON CONFLICT (name, workspace_id) DO UPDATE SET name = EXCLUDED.name RETURNING *;`,
      [safeParse.data.name, wsId],
    );

    if (!tagQuery.rows[0]) {
      return res.status(404).json({ error: "Tag not found" });
    }

    const tag = tagQuery.rows[0];

    const result = await db.query(
      `INSERT INTO task_tags (tag_id, task_id) VALUES ($1, $2) ON CONFLICT (tag_id, task_id) DO UPDATE SET tag_id = EXCLUDED.tag_id RETURNING *;`,
      [tag.id, taskId],
    );

    res.status(201).json({ taskTag: result.rows[0] });
  } catch (error) {
    console.error("Error attaching tag to task:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Routers

const taskRouter = Router({ mergeParams: true });
taskRouter.use(validateApiKey)

taskRouter.post("/", createTask);
taskRouter.get("/", getTasks);
taskRouter.delete("/:taskId", deleteTask);
taskRouter.patch("/:taskId", updateTask);
taskRouter.post("/:taskId/tags/:name", attachTagToTask);

export default taskRouter;
