"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = __importDefault(require("../db/connection"));
const express_1 = require("express");
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const workspaceSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Workspace name cannot be empty')
});
async function createWorkspace(req, res) {
    const body = workspaceSchema.parse(req.body);
    try {
        const result = await connection_1.default.query("INSERT INTO workspaces (name) VALUES ($1) RETURNING *", [body.name]);
        res.status(201).json({ workspace: result.rows[0] });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error('Error creating workspace:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
;
async function generateAPIKey(req, res) {
    const wsId = Number(req.params.wsId);
    const workspace = await connection_1.default.query("SELECT * FROM workspaces WHERE id = $1", [wsId]);
    if (!workspace.rows.length)
        return res.status(404).json({ error: "Workspace not found" });
    const body = crypto_1.default.randomBytes(32).toString() + wsId;
    const key = bcrypt_1.default.hash(body, 5); // using lower salt round value to ensure faster processing 
    try {
        const result = await connection_1.default.query("INSERT into api_keys (workspace_id, key) VALUES ($1, $2) RETURNING id", [wsId, key]);
        res.status(201).json({ apiKey: body, id: result.rows[0].id });
    }
    catch (error) {
        console.error('Error generating APIKey', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
// Routers
const workspaceRouter = (0, express_1.Router)();
workspaceRouter.post("/", createWorkspace);
workspaceRouter.post("/:wsId/apikeys", generateAPIKey);
exports.default = workspaceRouter;
//# sourceMappingURL=workspaceController.js.map