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
    const wsId = Number(req.params.wsId);
    try {
        const result = await connection_1.default.query("SELECT * FROM tasks WHERE workspace_id = $1 AND deleted_at IS NULL ORDER BY due_date ASC", [wsId]);
        res.status(201).json({ tasks: result.rows });
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
    const query = `UPDATE tasks SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} AND workspace_id = $${idx + 1} RETURNING *`;
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
// Routers
const taskRouter = (0, express_1.Router)({ mergeParams: true });
taskRouter.post("/", validateAPIKey_1.validateApiKey, createTask);
taskRouter.get("/", validateAPIKey_1.validateApiKey, getTasks);
taskRouter.delete("/:taskId", validateAPIKey_1.validateApiKey, deleteTask);
taskRouter.patch('/:taskId', validateAPIKey_1.validateApiKey, updateTask);
exports.default = taskRouter;
//# sourceMappingURL=taskController.js.map