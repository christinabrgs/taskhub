"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = __importDefault(require("../db/connection"));
const express_1 = require("express");
const zod_1 = require("zod");
const validateAPIKey_1 = require("../middleware/validateAPIKey");
const taskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "title cannot be empty"),
    description: zod_1.z.string().min(1, "description cannot be empty"),
    status: zod_1.z.enum(['todo', 'in_progress', 'done']).default('todo'),
    dueDate: zod_1.z.coerce.date().optional(),
});
const partialTaskUpdateSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "title cannot be empty").optional(),
    description: zod_1.z.string().min(1, "description cannot be empty").optional(),
    status: zod_1.z.enum(['todo', 'in_progress', 'done']).default('todo').optional(),
    dueDate: zod_1.z.coerce.date().optional(),
});
const tagSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "name cannot be empty"),
});
const taskListSchema = zod_1.z.object({
    q: zod_1.z.string().optional(),
    status: zod_1.z.enum(['todo', 'in_progress', 'done']).optional(),
    due_before: zod_1.z.string().optional(),
    cursor: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().min(1).max(100).optional(),
    tag: zod_1.z.string().optional(),
});
async function createTask(req, res) {
    const wsId = Number(req.params.wsId);
    const { id: apiKey } = res.locals.apiKey;
    const body = taskSchema.parse(req.body);
    try {
        const result = await connection_1.default.query("INSERT INTO tasks (title, description, status, due_date, created_by, workspace_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *", [body.title, body.description, body.status, body.dueDate, apiKey, wsId]);
        res.status(201).json({ task: result.rows[0] });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
async function getTasks(req, res) {
    const { status, due_before, q, cursor, limit, tag } = taskListSchema.parse(req.query);
    const wsId = Number(req.params.wsId);
    let query = "SELECT tasks.*, array_agg(tags.name) as tag_names FROM tasks LEFT JOIN task_tags ON task_tags.task_id = tasks.id LEFT JOIN tags ON task_tags.tag_id = tags.id WHERE tasks.workspace_id = $1 AND deleted_at IS NULL";
    // I should probably have an actual type here, but this works in the mean time
    let values = [wsId];
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
        let cursor = null;
        const result = await connection_1.default.query(query + ` GROUP BY tasks.id ORDER BY tasks.id ASC LIMIT $${index};`, values);
        if (result.rows.length === limit) {
            cursor = result.rows[result.rows.length - 1].id;
        }
        res.status(201).json({ tasks: result.rows, cursor });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
async function deleteTask(req, res) {
    const wsId = Number(req.params.wsId);
    const taskId = Number(req.params.taskId);
    try {
        const result = await connection_1.default.query("SELECT * FROM tasks WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL", [wsId, taskId]);
        result.rows.length === 0 && res.status(404).json({ error: "Task not found" });
        await connection_1.default.query("UPDATE tasks SET deleted_at = NOW() WHERE id = $1", [taskId]);
        res.status(204).send();
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
async function updateTask(req, res) {
    const wsId = Number(req.params.wsId);
    const taskId = Number(req.params.taskId);
    const body = partialTaskUpdateSchema.parse(req.body);
    const fields = [];
    const values = [];
    let idx = 1;
    for (const key in body) {
        let column = key === 'dueDate' ? 'due_date' : key;
        fields.push(`${column} = $${idx}`);
        values.push(body[key]);
        idx++;
    }
    values.push(taskId);
    const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${idx} AND workspace_id = $${idx + 1} RETURNING *`;
    values.push(wsId);
    try {
        const result = await connection_1.default.query(query, values);
        result.rows.length === 0 && res.status(404).json({ error: "Task not found" });
        res.status(200).json({ task: result.rows[0] });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
async function attachTagToTask(req, res) {
    const wsId = Number(req.params.wsId);
    const taskId = Number(req.params.taskId);
    const name = req.params.name;
    const body = tagSchema.parse({ name });
    try {
        // check if tag exists, if it doesn't create it
        const tagQuery = await connection_1.default.query(`INSERT INTO tags (name, workspace_id) VALUES ($1, $2) ON CONFLICT (name, workspace_id) DO UPDATE SET name = EXCLUDED.name RETURNING *;`, [body.name, wsId]);
        if (!tagQuery.rows[0]) {
            return res.status(404).json({ error: "Tag not found" });
        }
        const tag = tagQuery.rows[0];
        const result = await connection_1.default.query(`INSERT INTO task_tags (tag_id, task_id) VALUES ($1, $2) ON CONFLICT (tag_id, task_id) DO UPDATE SET tag_id = EXCLUDED.tag_id RETURNING *;`, [tag.id, taskId]);
        res.status(201).json({ taskTag: result.rows[0] });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error('Error attaching tag to task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
// Routers
const taskRouter = (0, express_1.Router)({ mergeParams: true });
taskRouter.post("/", validateAPIKey_1.validateApiKey, createTask);
taskRouter.get("/", validateAPIKey_1.validateApiKey, getTasks);
taskRouter.delete("/:taskId", validateAPIKey_1.validateApiKey, deleteTask);
taskRouter.patch('/:taskId', validateAPIKey_1.validateApiKey, updateTask);
taskRouter.post('/:taskId/tags/:name', validateAPIKey_1.validateApiKey, attachTagToTask);
exports.default = taskRouter;
//# sourceMappingURL=taskController.js.map